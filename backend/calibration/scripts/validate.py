"""Held-out validation. Applies the SHIPPED baselines (from the diction module,
not the fit) to the train split, which was never used for fitting. Reports the
real false-flag and catch rates the calibrated flag achieves on unseen data.

Run from `backend/`: PYTHONPATH=src uv run python calibration/scripts/validate.py
"""

import json
import statistics
from collections import defaultdict
from pathlib import Path

from diction.scoring.phoneme_baselines import FLAG_K, PHONEME_BASELINES

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / 'data'
CONTRAST = {'θ', 'ð', 'ɹ', 'ɪ', 'iː', 'æ', 'ɛ', 'v', 'w', 's', 'ʃ', 'f'}


def flagged(phoneme: str, gop: float) -> bool:
    baseline = PHONEME_BASELINES.get(phoneme)
    if baseline is None:
        return False
    mean, std = baseline
    return std > 0 and (gop - mean) / std < -FLAG_K


def main() -> None:
    good_flags: dict[str, list[int]] = defaultdict(list)
    bad_flags: dict[str, list[int]] = defaultdict(list)
    for line in (DATA_DIR / 'pairs-train.jsonl').read_text().splitlines():
        r = json.loads(line)
        hit = int(flagged(r['phoneme'], r['gop']))
        if r['accuracy'] >= 2.0:
            good_flags[r['phoneme']].append(hit)
        elif r['accuracy'] <= 1.0:
            bad_flags[r['phoneme']].append(hit)

    print('HELD-OUT (train split) validation of the shipped thresholds\n')
    print(f'{"ph":<5}{"contrast":>9}{"false_flag":>12}{"caught":>9}')
    fp_all, tp_all = [], []
    for p in sorted(PHONEME_BASELINES):
        g, b = good_flags.get(p, []), bad_flags.get(p, [])
        if len(g) < 20 or len(b) < 10:
            continue
        fp = statistics.mean(g)
        tp = statistics.mean(b)
        fp_all.append(fp)
        tp_all.append(tp)
        star = 'yes' if p in CONTRAST else ''
        print(f'{p:<5}{star:>9}{fp:>12.2f}{tp:>9.2f}')

    print(f'\npooled false-flag on native (good): {statistics.mean(fp_all):.3f}')
    print(f'pooled catch of clear errors (bad): {statistics.mean(tp_all):.3f}')


if __name__ == '__main__':
    main()
