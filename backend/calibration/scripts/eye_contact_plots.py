"""Figure for the interview eye-contact separation eval. Reads
eye_contact_eval.json and writes figures/eye_contact_separation.png. Harness-only:
needs matplotlib and seaborn (`uv pip install matplotlib seaborn`), not app deps.

Run from `backend/`: python calibration/scripts/eye_contact_plots.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / 'data'
FIGS = HERE.parent / 'figures'

BAD = '#b23a2e'
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


def main() -> None:
    data = json.loads((DATA_DIR / 'eye_contact_eval.json').read_text())
    good = data['clips']['good']
    bad = data['clips']['bad']
    shipped = data['shipped_yaw_threshold_deg']
    pre_fix = data['pre_fix_yaw_threshold_deg']
    sweep = data['yaw_sweep']

    style()
    fig, (left, right) = plt.subplots(1, 2, figsize=(13, 5))

    sns.histplot(
        good['yaw_samples'],
        bins=40,
        stat='density',
        color=ACCENT,
        alpha=0.55,
        label=f'good: {good["note"]}',
        ax=left,
    )
    sns.histplot(
        bad['yaw_samples'],
        bins=40,
        stat='density',
        color=BAD,
        alpha=0.55,
        label=f'bad: {bad["note"]}',
        ax=left,
    )
    for threshold, color, name in (
        (pre_fix, NEUTRAL, 'old gate'),
        (shipped, INK, 'new gate'),
    ):
        left.axvline(threshold, color=color, linestyle='--', linewidth=1.4)
        left.axvline(-threshold, color=color, linestyle='--', linewidth=1.4)
        left.text(
            threshold,
            left.get_ylim()[1] * 0.94,
            f'±{threshold:g}°\n{name}',
            color=color,
            ha='left',
            va='top',
            fontsize=9,
        )
    left.set_xlabel('head yaw, degrees from the lens axis (0 = centered on lens)')
    left.set_ylabel('frame density')
    left.set_title('Per-frame yaw: the lens-look and the screen-glance separate')
    left.legend(loc='upper left', fontsize=9)

    thresholds = [row['yaw_threshold_deg'] for row in sweep]
    separation = [row['separation_pct'] for row in sweep]
    right.plot(thresholds, separation, marker='o', color=ACCENT, linewidth=2)
    right.axhline(15.0, color=NEUTRAL, linestyle='--', linewidth=1.4)
    right.text(
        thresholds[-1], 16.5, 'gate floor +15', color=NEUTRAL, ha='right', fontsize=9
    )
    right.axvline(pre_fix, color=NEUTRAL, linestyle=':', linewidth=1.2)
    right.axvline(shipped, color=INK, linestyle=':', linewidth=1.2)
    for row in sweep:
        if row['yaw_threshold_deg'] in (shipped, pre_fix):
            right.annotate(
                f'{row["separation_pct"]:+.0f}',
                (row['yaw_threshold_deg'], row['separation_pct']),
                textcoords='offset points',
                xytext=(6, 6),
                color=INK,
                fontsize=9,
            )
    right.set_xlabel('yaw threshold, degrees')
    right.set_ylabel('looking-percentage separation (good − bad)')
    right.set_title('The old 15° gate erased a separation the raw signal holds')

    fig.tight_layout()
    FIGS.mkdir(exist_ok=True)
    out = FIGS / 'eye_contact_separation.png'
    fig.savefig(out, dpi=150, bbox_inches='tight')
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
