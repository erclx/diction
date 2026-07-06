"""Figure for the minimal-pair verdict evaluation. Reads contrast_eval.json and
writes figures/contrast_verdict.png. Harness-only: needs matplotlib and seaborn
(`uv pip install matplotlib seaborn`), not app deps.

Run from `backend/`: python calibration/contrast_plots.py
"""

import json
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

HERE = Path(__file__).parent
FIGS = HERE / 'figures'

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
    data = json.loads((HERE / 'contrast_eval.json').read_text())
    tally = data['tally']
    rows = [r for r in data['rows'] if 'error' not in r]

    old_fp_by_contrast: dict[str, int] = defaultdict(int)
    new_fp_by_contrast: dict[str, int] = defaultdict(int)
    for row in rows:
        if row['kind'] != 'wrong':
            continue
        old_fp_by_contrast[row['label']] += int(not row['old_retry'])
        new_fp_by_contrast.setdefault(row['label'], 0)
        new_fp_by_contrast[row['label']] += int(not row['new_retry'])

    style()
    fig, (left, right) = plt.subplots(1, 2, figsize=(12, 5))

    kinds = ['false pass\n(wrong word accepted)', 'false retry\n(right word rejected)']
    old = [tally['old_fp'], tally['old_fr']]
    new = [tally['new_fp'], tally['new_fr']]
    x = range(len(kinds))
    width = 0.38
    left.bar(
        [i - width / 2 for i in x], old, width, label='absolute flag', color=NEUTRAL
    )
    left.bar(
        [i + width / 2 for i in x], new, width, label='competitor check', color=ACCENT
    )
    left.set_xticks(list(x))
    left.set_xticklabels(kinds)
    left.set_ylabel('clips (of 32 correct + 32 wrong)')
    left.set_title('Verdict errors across the whole drill set')
    left.legend()
    for i, (o, n) in enumerate(zip(old, new, strict=True)):
        left.text(i - width / 2, o + 0.2, str(o), ha='center', color=INK)
        left.text(i + width / 2, n + 0.2, str(n), ha='center', color=INK)

    labels = list(old_fp_by_contrast)
    old_vals = [old_fp_by_contrast[c] for c in labels]
    new_vals = [new_fp_by_contrast[c] for c in labels]
    y = range(len(labels))
    right.barh(
        [i + width / 2 for i in y],
        old_vals,
        width,
        label='absolute flag',
        color=NEUTRAL,
    )
    right.barh(
        [i - width / 2 for i in y], new_vals, width, label='competitor check', color=BAD
    )
    right.set_yticks(list(y))
    right.set_yticklabels(labels)
    right.set_xlabel('wrong words accepted as pass (max 4)')
    right.set_title('False passes per contrast')
    right.legend()

    fig.tight_layout()
    FIGS.mkdir(exist_ok=True)
    out = FIGS / 'contrast_verdict.png'
    fig.savefig(out, dpi=150, bbox_inches='tight')
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
