"""
Monte Carlo power for the kit leftover-of-trio residual.

Does not touch experiment code. Trial counts from semantic_learning_kit
morph_task: 12 A-prime + 12 none (4 C/D pattern-breakers dropped).
Binding ABC vs ABD is between-subjects (half of N).

Usage:
  python simulate_kit_leftover_power.py
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

OUT = Path(__file__).with_name("simulate_kit_leftover_power.json")
SEED = 20260908
N_SIMS_CURVE = 8000
N_SIMS_GRID = 5000
P0 = 0.50
SD_P = 0.066  # person-mean sd from size sitting QC baseline
LOGIT_SD = SD_P / (P0 * (1.0 - P0))  # 0.264 at p0=0.5
DELTA_PP = [0, 3, 5, 8, 10, 15]
N_GRID = [24, 32, 40, 64]
REPS_GRID = [4, 8, 12]
LIVE_N_PRIME = 12
LIVE_N_NONE = 12
DEFAULT_N = 40
DEFAULT_REPS = 8


def logit(p: float) -> float:
    p = min(max(p, 1e-12), 1.0 - 1e-12)
    return math.log(p / (1.0 - p))


def invlogit(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def delta_logit_from_pp(delta_pp: float, p0: float = P0) -> float:
    return logit(p0 + delta_pp / 100.0) - logit(p0)


def _betacf(a: float, b: float, x: float) -> float:
    maxit = 200
    eps = 3e-12
    fpmin = 1e-30
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < fpmin:
        d = fpmin
    d = 1.0 / d
    h = d
    for m in range(1, maxit + 1):
        m2 = 2.0 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < eps:
            return h
    return h


def betai(a: float, b: float, x: float) -> float:
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    bt = math.exp(
        math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
        + a * math.log(x) + b * math.log(1.0 - x)
    )
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def t_two_sided_p(t: float, df: float) -> float:
    t = abs(t)
    if not math.isfinite(t):
        return 0.0
    if t == 0.0:
        return 1.0
    x = df / (df + t * t)
    return betai(df / 2.0, 0.5, x)


def binomial(rng: random.Random, n: int, p: float) -> int:
    if p <= 0.0:
        return 0
    if p >= 1.0:
        return n
    k = 0
    for _ in range(n):
        if rng.random() < p:
            k += 1
    return k


def expected_signed_delta(delta_logit: float, p0: float = P0, logit_sd: float = LOGIT_SD, n: int = 80000, seed: int = 1) -> float:
    rng = random.Random(seed)
    lp0 = logit(p0)
    s = 0.0
    for _ in range(n):
        u = rng.gauss(0.0, logit_sd)
        s += invlogit(lp0 + u + delta_logit) - invlogit(lp0 + u)
    return s / n


def simulate(
    n_people: int,
    n_prime: int,
    n_none: int,
    delta_logit: float,
    p0: float,
    logit_sd: float,
    n_sims: int,
    rng: random.Random,
) -> dict:
    lp0 = logit(p0)
    n_abc = n_people // 2
    df = n_people - 1
    n_sig = 0
    n_sig5 = 0
    n_wrong = 0
    mean_sum = 0.0
    mean_sq = 0.0
    inv_p = 1.0 / n_prime
    inv_n = 1.0 / n_none

    for _ in range(n_sims):
        d_sum = 0.0
        d_sq = 0.0
        for i in range(n_people):
            bind = 1.0 if i < n_abc else -1.0
            u = rng.gauss(0.0, logit_sd)
            p_none = invlogit(lp0 + u)
            p_prime = invlogit(lp0 + u + bind * delta_logit)
            d = binomial(rng, n_prime, p_prime) * inv_p - binomial(rng, n_none, p_none) * inv_n
            d_star = bind * d
            d_sum += d_star
            d_sq += d_star * d_star
        mean = d_sum / n_people
        var = (d_sq - d_sum * d_sum / n_people) / df
        se = math.sqrt(max(var, 0.0) / n_people)
        if se > 1e-15:
            tstat = mean / se
            p_two = t_two_sided_p(tstat, df)
        else:
            p_two = 0.0 if abs(mean) > 1e-15 else 1.0
        mean_sum += mean
        mean_sq += mean * mean
        if p_two < 0.05 and mean > 0.0:
            n_sig += 1
            if abs(mean) >= 0.05:
                n_sig5 += 1
        elif p_two < 0.05 and mean < 0.0:
            n_wrong += 1

    p_sig = n_sig / n_sims
    p_5 = n_sig5 / n_sims
    mu = mean_sum / n_sims
    var_m = (mean_sq - mean_sum * mean_sum / n_sims) / max(n_sims - 1, 1)

    def mc_se(p: float) -> float:
        return math.sqrt(p * (1.0 - p) / n_sims)

    return {
        "n_sims": n_sims,
        "power_sig": p_sig,
        "power_sig_mc_se": mc_se(p_sig),
        "power_5pp": p_5,
        "power_5pp_mc_se": mc_se(p_5),
        "mean_dstar_pp": mu * 100.0,
        "sd_dstar_pp": math.sqrt(max(var_m, 0.0)) * 100.0,
        "p_wrong_sign_sig": n_wrong / n_sims,
    }


def pct(x: float) -> float:
    return round(100.0 * x, 1)


def main() -> None:
    rng = random.Random(SEED)
    logit_map = {d: delta_logit_from_pp(d) for d in DELTA_PP}
    exp_delta = {
        d: expected_signed_delta(logit_map[d], seed=SEED + 100 + d) for d in DELTA_PP
    }

    def curve(n_people: int, n_reps: int, n_sims: int) -> list:
        rows = []
        for d in DELTA_PP:
            r = simulate(n_people, n_reps, n_reps, logit_map[d], P0, LOGIT_SD, n_sims, rng)
            r["delta_pp"] = d
            r["delta_logit"] = logit_map[d]
            r["expected_delta_pp"] = exp_delta[d] * 100.0
            rows.append(r)
        return rows

    live = curve(DEFAULT_N, LIVE_N_PRIME, N_SIMS_CURVE)
    default = curve(DEFAULT_N, DEFAULT_REPS, N_SIMS_CURVE)
    even_only = curve(DEFAULT_N, 4, N_SIMS_CURVE)

    grid: dict = {}
    for d in (5, 8):
        grid[str(d)] = {}
        for n in N_GRID:
            grid[str(d)][str(n)] = {}
            for r in REPS_GRID:
                cell = simulate(n, r, r, logit_map[d], P0, LOGIT_SD, N_SIMS_GRID, rng)
                cell["expected_delta_pp"] = exp_delta[d] * 100.0
                grid[str(d)][str(n)][str(r)] = cell

    blowout = {}
    p0_b = 0.88
    logit_sd_b = SD_P / (p0_b * (1.0 - p0_b))
    for d in (8, 15):
        dl = delta_logit_from_pp(d, p0=P0)
        exp_b = expected_signed_delta(dl, p0=p0_b, logit_sd=logit_sd_b, seed=900 + d)
        cell = simulate(DEFAULT_N, DEFAULT_REPS, DEFAULT_REPS, dl, p0_b, logit_sd_b, 4000, rng)
        cell["expected_delta_pp"] = exp_b * 100.0
        cell["p0"] = p0_b
        blowout[str(d)] = cell

    out = {
        "seed": SEED,
        "p0": P0,
        "person_sd_pp": SD_P * 100.0,
        "logit_sd": LOGIT_SD,
        "n_sims_curve": N_SIMS_CURVE,
        "n_sims_grid": N_SIMS_GRID,
        "live_trialset": {
            "source": "semantic_learning_kit morph.trials",
            "n_a_prime": LIVE_N_PRIME,
            "n_none": LIVE_N_NONE,
            "n_breakers_excluded": 4,
            "n_people_assumed": DEFAULT_N,
            "note": "6 pictures (X,Y,Z x polarity) x 2 A-prime + 2 none; C/D primes dropped",
        },
        "delta_logit": logit_map,
        "expected_delta_pp": {str(k): v * 100.0 for k, v in exp_delta.items()},
        "curve_live_12": live,
        "curve_default_8": default,
        "curve_even_jumble_4": even_only,
        "grid": grid,
        "blowout_p0_88": blowout,
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")

    def show(label: str, rows: list) -> None:
        print(f"\n=== {label} ===")
        print(f"{'d pp':>6} {'logit d':>8} {'E[D] pp':>8} {'power':>7} {'|D|>=5':>7} {'mean D':>8}")
        for r in rows:
            print(
                f"{r['delta_pp']:6d} {r['delta_logit']:8.3f} {r['expected_delta_pp']:8.2f} "
                f"{pct(r['power_sig']):6.1f}% {pct(r['power_5pp']):6.1f}% {r['mean_dstar_pp']:8.2f}"
            )

    print(f"person logit sd {LOGIT_SD:.3f}  (from {SD_P * 100:.1f} pp at p0={P0})")
    show(f"N={DEFAULT_N} live 12+12", live)
    show(f"N={DEFAULT_N} default 8+8", default)
    show(f"N={DEFAULT_N} even-jumble only 4+4", even_only)
    print("\n=== Grid power (sig / |D|>=5) ===")
    for d in (5, 8):
        print(f"\nd = {d} pp")
        print("N\\reps", " ".join(f"{r:>14d}" for r in REPS_GRID))
        for n in N_GRID:
            cells = [grid[str(d)][str(n)][str(r)] for r in REPS_GRID]
            print(
                f"{n:6d}",
                " ".join(f"{pct(c['power_sig']):5.1f}/{pct(c['power_5pp']):5.1f}" for c in cells),
            )
    print("\n=== Blowout p0=0.88, N=40, 8+8 (same logit d as even jumble) ===")
    for d, cell in blowout.items():
        print(
            f"d={d} pp-at-0.50  E[D]={cell['expected_delta_pp']:.2f} pp  "
            f"power {pct(cell['power_sig'])}%  |D|>=5 {pct(cell['power_5pp'])}%"
        )
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
