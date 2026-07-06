"""Publication figures for the calibration case study. Reads the fitted data and
the raw measured pairs, writes static PNGs to figures/. Harness-only: needs
matplotlib and seaborn (`uv pip install matplotlib seaborn`), not app deps.

Run: uv run --project . python calibration/plots.py
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

# DESIGN.md palette, so the figures match the product's identity.
GOOD = '#4f7a3f'
BAD = '#b23a2e'
ACCENT = '#0f766e'
NEUTRAL = '#9a9186'
INK = '#2b2622'
K = 1.6
CONTRAST = {'θ', 'ð', 'ɹ', 'ɪ', 'iː', 'æ', 'ɛ', 'v', 'w', 's', 'ʃ', 'f'}


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
            'axes.titlecolor': INK,
            'figure.facecolor': 'white',
            'savefig.facecolor': 'white',
            'grid.color': '#e7e0d3',
            'axes.titlesize': 17,
            'axes.titlepad': 14,
            'axes.labelsize': 13,
            'axes.labelpad': 10,
            'xtick.labelsize': 12,
            'ytick.labelsize': 13,
        }
    )


def load_summary() -> list[dict[str, object]]:
    base = json.loads((HERE / 'baselines.json').read_text())
    dist = json.loads((HERE / 'distributions.json').read_text())
    rows = []
    for phoneme, b in base.items():
        d = dist.get(phoneme, {})
        rows.append(
            {
                'ipa': phoneme,
                'contrast': phoneme in CONTRAST,
                'good_mean': b['mean'],
                'bad_mean': d.get('bad_mean'),
                'std': b['std'],
                'auc': b['auc'],
                'threshold': b['mean'] - K * b['std'],
            }
        )
    return rows


def load_pairs() -> tuple[dict[str, list[float]], dict[str, list[float]]]:
    good: dict[str, list[float]] = defaultdict(list)
    bad: dict[str, list[float]] = defaultdict(list)
    for line in (HERE / 'pairs.jsonl').read_text().splitlines():
        r = json.loads(line)
        if r['accuracy'] >= 2.0:
            good[r['phoneme']].append(r['gop'])
        elif r['accuracy'] <= 1.0:
            bad[r['phoneme']].append(r['gop'])
    return good, bad


def fig_baselines(rows: list[dict[str, object]]) -> None:
    rows = sorted(rows, key=lambda r: r['good_mean'])
    ys = range(len(rows))
    fig, ax = plt.subplots(figsize=(9.5, 13))
    ax.margins(y=0.015)
    ax.axvline(-5.0, color=NEUTRAL, linestyle='--', linewidth=2, zorder=1)
    ax.text(
        -5.0,
        len(rows) - 0.2,
        '  old global −5.0',
        color=NEUTRAL,
        fontsize=13,
        va='top',
        ha='left',
        style='italic',
    )
    for y, r in zip(ys, rows, strict=True):
        ax.plot(
            [r['bad_mean'], r['good_mean']],
            [y, y],
            color='#d8cfc0',
            linewidth=2,
            zorder=2,
        )
        ax.scatter(
            r['threshold'],
            y,
            s=42,
            facecolors='none',
            edgecolors=ACCENT,
            linewidths=1.8,
            zorder=3,
        )
    ax.scatter(
        [r['bad_mean'] for r in rows],
        list(ys),
        s=70,
        color=BAD,
        zorder=4,
        label='clearly wrong (score ≤ 1)',
    )
    ax.scatter(
        [r['good_mean'] for r in rows],
        list(ys),
        s=70,
        color=GOOD,
        zorder=4,
        label='clean read (score 2)',
    )
    ax.scatter(
        [],
        [],
        s=42,
        facecolors='none',
        edgecolors=ACCENT,
        linewidths=1.8,
        label='calibrated per-sound cut',
    )
    ax.set_yticks(list(ys))
    ax.set_yticklabels([r['ipa'] for r in rows])
    for tick, r in zip(ax.get_yticklabels(), rows, strict=True):
        tick.set_fontweight('bold' if r['contrast'] else 'normal')
        tick.set_color(INK if r['contrast'] else '#9a9186')
    ax.set_ylim(-1, len(rows))
    ax.set_xlabel('GOP  (mean log-posterior, higher is more confident)')
    ax.set_title(
        'Every sound sits on its own baseline', fontweight='bold', loc='left', pad=16
    )
    ax.legend(
        loc='upper center',
        bbox_to_anchor=(0.5, -0.06),
        ncol=3,
        frameon=False,
        fontsize=13,
    )
    fig.tight_layout()
    fig.savefig(FIGS / 'baselines.png', dpi=170, bbox_inches='tight')
    plt.close(fig)


def fig_distributions(
    rows: list[dict[str, object]],
    good: dict[str, list[float]],
    bad: dict[str, list[float]],
) -> None:
    picks = [
        ('iː', 'long-e  ·  sheep vs ship'),
        ('θ', 'th  ·  thin'),
        ('w', 'w  ·  walk'),
    ]
    by_ipa = {r['ipa']: r for r in rows}
    fig, axes = plt.subplots(1, 3, figsize=(15, 5.2), sharey=True)
    for ax, (ipa, label) in zip(axes, picks, strict=True):
        r = by_ipa[ipa]
        sns.histplot(
            good[ipa],
            ax=ax,
            color=GOOD,
            stat='density',
            bins=24,
            alpha=0.55,
            edgecolor='none',
            label='clean',
        )
        sns.histplot(
            bad[ipa],
            ax=ax,
            color=BAD,
            stat='density',
            bins=24,
            alpha=0.6,
            edgecolor='none',
            label='clearly wrong',
        )
        ax.axvline(r['threshold'], color=ACCENT, linestyle='--', linewidth=2)
        ax.set_xlim(-10, 1)
        ax.set_title(
            f'{label}\nAUC {r["auc"]:.2f}', fontsize=15, fontweight='bold', loc='left'
        )
        ax.set_xlabel('GOP')
        ax.set_ylabel('density' if ipa == 'iː' else '')
    axes[0].legend(frameon=True, fontsize=12, loc='upper left')
    fig.suptitle(
        'Clean and wrong pull apart, once the cut is per-sound',
        fontweight='bold',
        x=0.02,
        ha='left',
        fontsize=18,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(FIGS / 'distributions.png', dpi=170, bbox_inches='tight')
    plt.close(fig)


def fig_separation(rows: list[dict[str, object]]) -> None:
    rows = sorted(rows, key=lambda r: r['auc'])
    ys = range(len(rows))
    fig, ax = plt.subplots(figsize=(9.5, 13))
    colors = [ACCENT if r['contrast'] else '#cdbfa8' for r in rows]
    ax.barh(list(ys), [r['auc'] for r in rows], color=colors, height=0.6)
    ax.axvline(0.75, color=BAD, linestyle='--', linewidth=2)
    ax.text(
        0.75,
        len(rows) - 0.3,
        ' reliability gate 0.75',
        color=BAD,
        fontsize=13,
        va='top',
        style='italic',
    )
    ax.set_yticks(list(ys))
    ax.set_yticklabels([r['ipa'] for r in rows])
    for tick, r in zip(ax.get_yticklabels(), rows, strict=True):
        tick.set_fontweight('bold' if r['contrast'] else 'normal')
    ax.set_xlim(0.5, 1.0)
    ax.set_ylim(-1, len(rows))
    ax.set_xlabel('separation  (AUC of GOP over clean vs clearly-wrong)')
    ax.set_title(
        'Every sound clears the gate, vowels included',
        fontweight='bold',
        loc='left',
        pad=16,
    )
    fig.tight_layout()
    fig.savefig(FIGS / 'separation.png', dpi=170, bbox_inches='tight')
    plt.close(fig)


def main() -> None:
    FIGS.mkdir(exist_ok=True)
    style()
    rows = load_summary()
    good, bad = load_pairs()
    fig_baselines(rows)
    fig_distributions(rows, good, bad)
    fig_separation(rows)
    print(f'wrote {len(list(FIGS.glob("*.png")))} figures to {FIGS}')


if __name__ == '__main__':
    main()
