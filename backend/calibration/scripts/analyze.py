"""Fit the calibration from the raw pairs. No GPU, no model. Reads pairs.jsonl
and produces per-phoneme baselines, a reliability gate, and a global k.

good = human accuracy 2 (clean). bad = accuracy <= 1 (clearly wrong), the case
the flag must catch. The 1.x middle is borderline and left out of fitting.
"""

import json
import statistics
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / 'data'
CONTRAST = {'θ', 'ð', 'ɹ', 'ɪ', 'iː', 'æ', 'ɛ', 'v', 'w', 's', 'ʃ', 'f'}
AUC_GATE = 0.75
K_CANDIDATES = [1.0, 1.3, 1.6, 2.0]


def auc(good: list[float], bad: list[float]) -> float:
    """P(good gop > bad gop). 1.0 = perfect separation, 0.5 = none."""
    wins = 0
    for g in good:
        for b in bad:
            wins += (g > b) + 0.5 * (g == b)
    return wins / (len(good) * len(bad))


def main() -> None:
    good: dict[str, list[float]] = defaultdict(list)
    bad: dict[str, list[float]] = defaultdict(list)
    for line in (DATA_DIR / 'pairs.jsonl').read_text().splitlines():
        r = json.loads(line)
        if r['accuracy'] >= 2.0:
            good[r['phoneme']].append(r['gop'])
        elif r['accuracy'] <= 1.0:
            bad[r['phoneme']].append(r['gop'])

    phonemes = sorted(
        p for p in good if len(good[p]) >= 40 and len(bad.get(p, [])) >= 15
    )

    rows = []
    for p in phonemes:
        g, b = good[p], bad[p]
        mu = statistics.mean(g)
        sd = statistics.pstdev(g)
        a = auc(g, b)
        rates = {}
        for k in K_CANDIDATES:
            thr = mu - k * sd
            fp = sum(1 for x in g if x < thr) / len(g)
            tp = sum(1 for x in b if x < thr) / len(b)
            rates[k] = (fp, tp)
        rows.append((p, len(g), len(b), mu, sd, a, rates))

    reliable = [r for r in rows if r[5] >= AUC_GATE]
    print(
        f'{"ph":<4}{"contr":>6}{"n_g":>6}{"n_b":>5}{"mu":>8}{"sd":>7}{"auc":>6}'
        f'{"gate":>6}   fp/tp at k=1.0,1.3,1.6,2.0'
    )
    for p, ng, nb, mu, sd, a, rates in rows:
        gate = 'OK' if a >= AUC_GATE else 'weak'
        rt = '  '.join(f'{rates[k][0]:.2f}/{rates[k][1]:.2f}' for k in K_CANDIDATES)
        star = '*' if p in CONTRAST else ' '
        print(
            f'{p:<4}{star:>6}{ng:>6}{nb:>5}{mu:>8.2f}{sd:>7.2f}{a:>6.2f}'
            f'{gate:>6}   {rt}'
        )

    print(f'\nreliable (auc>={AUC_GATE}): {len(reliable)}/{len(rows)} phonemes')
    print('weak / no-verdict:', sorted(r[0] for r in rows if r[5] < AUC_GATE))
    print(
        'contrast phonemes that are weak:',
        sorted(r[0] for r in rows if r[5] < AUC_GATE and r[0] in CONTRAST),
    )

    for k in K_CANDIDATES:
        fps = [rates[k][0] for *_, rates in reliable]
        tps = [rates[k][1] for *_, rates in reliable]
        print(
            f'k={k}: reliable-pooled  mean fp(good flagged)={statistics.mean(fps):.3f}'
            f'  mean tp(bad caught)={statistics.mean(tps):.3f}'
        )

    baselines = {
        p: {
            'mean': round(mu, 4),
            'std': round(sd, 4),
            'auc': round(a, 4),
            'reliable': a >= AUC_GATE,
            'n_good': ng,
            'n_bad': nb,
        }
        for p, ng, nb, mu, sd, a, _ in rows
    }
    out = DATA_DIR / 'baselines.json'
    out.write_text(json.dumps(baselines, indent=2, ensure_ascii=False))
    print(f'\nwrote {out} ({len(baselines)} phonemes)')

    all_good = [x for p in phonemes for x in good[p]]
    all_bad = [x for p in phonemes for x in bad[p]]
    print('\nnormalize_gop calibration inputs:')
    print(
        f'  good gop  p50={statistics.median(all_good):.2f} '
        f'p10={sorted(all_good)[len(all_good) // 10]:.2f}'
    )
    print(
        f'  bad  gop  p50={statistics.median(all_bad):.2f} '
        f'p90={sorted(all_bad)[len(all_bad) * 9 // 10]:.2f}'
    )


if __name__ == '__main__':
    main()
