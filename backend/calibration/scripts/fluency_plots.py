"""Figure for the fluency-fit evaluation. Reads fluency_pairs.jsonl and
fluency_model.json, writes figures/fluency_fit.png. Harness-only: needs matplotlib
and seaborn (`uv pip install matplotlib seaborn`), not app deps.

Two panels tell the story. Left: predicted-versus-actual fluency on the held-out
split, the 0.40 correlation the fit validates. Right: the long-pause-ratio
distribution, near-zero for the whole corpus, which is why the pause features
cannot be calibrated here and ship as reasoned rather than fitted.

Run from `backend/`: python calibration/scripts/fluency_plots.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / 'data'
FIGS = HERE.parent / 'figures'

ACCENT = '#0f766e'
NEUTRAL = '#9a9186'
INK = '#2b2622'


def style() -> None:
    sns.set_theme(style='whitegrid', context='notebook')
    plt.rcParams.update(
        {
            'font.family': 'DejaVu Sans',
            'text.color': INK,
            'axes.labelcolor': INK,
            'axes.edgecolor': '#cfc6b8',
            'xtick.color': INK,
            'ytick.color': INK,
        }
    )


def predict(model: dict, row: dict) -> float:
    score = model['intercept']
    for name, term in model['weights'].items():
        score += term['weight'] * (row[name] - term['center']) / term['scale']
    return float(np.clip(score, 0.0, 100.0))


def main() -> None:
    model = json.loads((DATA_DIR / 'fluency_model.json').read_text())
    rows = [
        json.loads(line)
        for line in (DATA_DIR / 'fluency_pairs.jsonl').read_text().splitlines()
    ]
    holdout = [row for row in rows if row['split'] == 'holdout']

    actual = np.array([row['label'] for row in holdout])
    predicted = np.array([predict(model, row) for row in holdout])
    correlation = float(np.corrcoef(predicted, actual)[0, 1])
    long_pause = np.array([row['long_pause_ratio'] for row in rows])

    style()
    fig, (left, right) = plt.subplots(1, 2, figsize=(12, 5))

    left.scatter(actual, predicted, s=14, color=ACCENT, alpha=0.35, edgecolor='none')
    left.plot([0, 100], [0, 100], color=NEUTRAL, linestyle='--', linewidth=1)
    left.set_xlabel('human fluency label (0-100)')
    left.set_ylabel('predicted fluency (0-100)')
    left.set_title('Predicted vs human fluency, held-out split')
    left.text(
        0.05,
        0.92,
        f'held-out r = {correlation:.2f}\nn = {len(holdout)}',
        transform=left.transAxes,
        color=INK,
        fontsize=12,
    )

    right.hist(long_pause, bins=40, color=NEUTRAL)
    right.set_xlabel('long-pause ratio (fraction of clip in >0.3s pauses)')
    right.set_ylabel('clips')
    right.set_title('Why pauses cannot be calibrated here')
    right.text(
        0.30,
        0.80,
        'read-aloud corpus:\nalmost no clip hesitates',
        transform=right.transAxes,
        color=INK,
        fontsize=12,
    )

    fig.tight_layout()
    FIGS.mkdir(exist_ok=True)
    out = FIGS / 'fluency_fit.png'
    fig.savefig(out, dpi=150, bbox_inches='tight')
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
