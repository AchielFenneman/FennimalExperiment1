"""
N needed for 60% and 80% power on the live 12+12 leftover residual.

Same model as simulate_kit_leftover_power.py. Person-level Δ* pool, then
one-sample t-test of signed residual. Does not touch experiment code.

Usage:
  python simulate_kit_leftover_n_needed.py
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from simulate_kit_leftover_power import (
    LOGIT_SD,
    P0,
    binomial,
    delta_logit_from_pp,
    invlogit,
    logit,
    t_two_sided_p,
)

OUT = Path(__file__).with_name("simulate_kit_leftover_n_needed.json")
SEED = 20260908
N_PRIME = 12
N_NONE = 12
POOL = 40000
N_SIMS_SEARCH = 5000
N_SIMS_FINAL = 8000
# Original grid plus fillers so N-vs-δ is readable
DELTA_PP = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15]
TARGETS = (0.60, 0.80)
N_MIN = 8
N_MAX = 500


def ncdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def t_crit(df: float, alpha: float = 0.05) -> float:
    lo, hi = 0.0, 12.0
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        if t_two_sided_p(mid, df) > alpha:
            lo = mid
        else:
            hi = mid
    return hi


_TCRIT = {}


def t_crit_cached(n_people: int) -> float:
    df = n_people - 1
    if df not in _TCRIT:
        _TCRIT[df] = t_crit(df)
    return _TCRIT[df]


def make_pool(delta_logit: float, rng: random.Random) -> list[float]:
    lp0 = logit(P0)
    inv_p = 1.0 / N_PRIME
    inv_n = 1.0 / N_NONE
    pool = [0.0] * POOL
    for i in range(POOL):
        bind = 1.0 if (i % 2 == 0) else -1.0
        u = rng.gauss(0.0, LOGIT_SD)
        p_none = invlogit(lp0 + u)
        p_prime = invlogit(lp0 + u + bind * delta_logit)
        d = binomial(rng, N_PRIME, p_prime) * inv_p - binomial(rng, N_NONE, p_none) * inv_n
        pool[i] = bind * d
    return pool


def pool_moments(pool: list[float]) -> tuple[float, float]:
    n = len(pool)
    mu = sum(pool) / n
    var = sum((x - mu) ** 2 for x in pool) / (n - 1)
    return mu, math.sqrt(var)


def analytic_power(n_people: int, mu: float, sigma: float) -> float:
    if n_people < 3 or sigma <= 0:
        return 0.0
    ncp = mu / (sigma / math.sqrt(n_people))
    return 1.0 - ncdf(t_crit_cached(n_people) - ncp)


def power_from_pool(pool: list[float], n_people: int, n_sims: int, rng: random.Random) -> tuple[float, float]:
    df = n_people - 1
    n_ok = 0
    n_ok5 = 0
    p_len = len(pool)
    for _ in range(n_sims):
        s = 0.0
        sq = 0.0
        for _i in range(n_people):
            v = pool[rng.randrange(p_len)]
            s += v
            sq += v * v
        mean = s / n_people
        var = (sq - s * s / n_people) / df
        se = math.sqrt(max(var, 0.0) / n_people)
        if se > 1e-15:
            p_two = t_two_sided_p(mean / se, df)
        else:
            p_two = 0.0 if abs(mean) > 1e-15 else 1.0
        if p_two < 0.05 and mean > 0.0:
            n_ok += 1
            if abs(mean) >= 0.05:
                n_ok5 += 1
    return n_ok / n_sims, n_ok5 / n_sims


def first_even_analytic(mu: float, sigma: float, target: float) -> int:
    n = N_MIN
    if n % 2:
        n += 1
    while n <= N_MAX:
        if analytic_power(n, mu, sigma) >= target:
            return n
        n += 2
    return N_MAX


def walk_mc(pool: list[float], start: int, target: float, rng: random.Random) -> dict:
    start = max(N_MIN, min(N_MAX, start))
    if start % 2:
        start += 1

    def eval_n(n: int, sims: int) -> tuple[float, float]:
        return power_from_pool(pool, n, sims, rng)

    n = start
    p, p5 = eval_n(n, N_SIMS_SEARCH)
    # Walk toward the threshold
    if p >= target:
        while n - 2 >= N_MIN:
            p2, p52 = eval_n(n - 2, N_SIMS_SEARCH)
            if p2 >= target:
                n -= 2
                p, p5 = p2, p52
            else:
                break
    else:
        while n + 2 <= N_MAX:
            n += 2
            p, p5 = eval_n(n, N_SIMS_SEARCH)
            if p >= target:
                break

    p_final, p5_final = eval_n(n, N_SIMS_FINAL)
    # If the high-sim estimate dropped below target, step up once more
    while p_final < target and n + 2 <= N_MAX:
        n += 2
        p_final, p5_final = eval_n(n, N_SIMS_FINAL)

    return {
        "n": n,
        "power": p_final,
        "power_5pp": p5_final,
        "power_mc_se": math.sqrt(p_final * (1.0 - p_final) / N_SIMS_FINAL),
        "capped": n >= N_MAX and p_final < target,
    }


def main() -> None:
    rng = random.Random(SEED)
    rows = []
    for d in DELTA_PP:
        dl = delta_logit_from_pp(d)
        print(f"pool d={d} pp ...", flush=True)
        pool = make_pool(dl, rng)
        mu, sigma = pool_moments(pool)
        rec = {
            "delta_pp": d,
            "delta_logit": dl,
            "mu_pp": mu * 100.0,
            "person_sd_pp": sigma * 100.0,
            "targets": {},
        }
        for tgt in TARGETS:
            n0 = first_even_analytic(mu, sigma, tgt)
            print(f"  analytic N for {int(tgt*100)}% = {n0} (mu={mu*100:.2f} pp, sd={sigma*100:.1f} pp)", flush=True)
            found = walk_mc(pool, n0, tgt, rng)
            found["n_analytic"] = n0
            rec["targets"][str(int(tgt * 100))] = found
            print(
                f"  MC N for {int(tgt*100)}% = {found['n']}  "
                f"power={found['power']*100:.1f}%  |D|>=5={found['power_5pp']*100:.1f}%",
                flush=True,
            )
        rows.append(rec)

    out = {
        "seed": SEED,
        "n_prime": N_PRIME,
        "n_none": N_NONE,
        "pool": POOL,
        "n_sims_final": N_SIMS_FINAL,
        "p0": P0,
        "rows": rows,
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("\n=== N needed (12+12, signed t-test) ===")
    print(f"{'d pp':>6} {'E[D]':>7} {'N 60%':>7} {'pow':>7} {'N 80%':>7} {'pow':>7}")
    for rec in rows:
        t60 = rec["targets"]["60"]
        t80 = rec["targets"]["80"]
        print(
            f"{rec['delta_pp']:6d} {rec['mu_pp']:6.2f} "
            f"{t60['n']:7d} {t60['power']*100:6.1f}% "
            f"{t80['n']:7d} {t80['power']*100:6.1f}%"
        )
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
