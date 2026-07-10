# Phoneme-flag calibration

The offline experiment that set the pronunciation-flag thresholds shipped in
`src/diction/scoring/phoneme_baselines.py`. It is a small supervised-learning
loop: labeled data in, a per-phoneme threshold out, validated on held-out data.

Kept in the repo so the calibration can be reproduced or re-run against a newer
model without rebuilding the setup. It is not imported by the app.

This file is the runbook. The method, decisions, and findings live in
`.claude/context/calibration.md`, and the narrative write-up is `CASE_STUDY.md`.

Two separate evals live alongside it. `scripts/contrast_eval.py` measures whether the
production drill's pass-or-retry verdict tells the target sound of a minimal pair
from its competitor, written up in `CONTRAST_EVAL.md`. `scripts/fluency_eval.py` fits the
reference-free passage fluency score against the corpus fluency labels, written up
in `FLUENCY_EVAL.md`. Both are different questions from the phoneme-threshold fit,
so they stay out of the case study.

## The loop

1. **Data.** speechocean762 (Apache-2.0): 5000 English clips from non-native
   speakers, every phoneme scored 0-2 by five human experts.
2. **Measure.** Run the real wav2vec2 GOP over each clip and pair each phoneme's
   GOP with its human accuracy label. Whisper is skipped: calibration aligns
   against the known reference text, so only the acoustic model is needed.
3. **Fit.** Per phoneme, take the native (accuracy 2) GOP mean and standard
   deviation. Flag a phoneme when its GOP falls `FLAG_K` (1.6) standard
   deviations below its own mean. Set a reliability gate (AUC >= 0.75) so a
   phoneme that does not separate never flags.
4. **Validate.** Apply the fitted thresholds to the untouched train split.
   Result: 7.0% false-flag on native speech, 66% catch of clear errors.

## Re-run

Needs the model stack (a GPU helps) plus the dataset library:

```bash
cd backend
uv sync --extra scoring              # torch, wav2vec2, phonemizer, ...
uv pip install datasets matplotlib seaborn  # harness-only, not app deps

PYTHONPATH=src uv run python calibration/scripts/measure.py 300        # smoke test first
PYTHONPATH=src uv run python calibration/scripts/measure.py 2500       # full test split
PYTHONPATH=src uv run python calibration/scripts/measure.py 2500 train # held-out split
uv run --project . python calibration/scripts/analyze.py              # fit -> data/baselines.json
PYTHONPATH=src uv run python calibration/scripts/validate.py          # held-out check
uv run --project . python calibration/scripts/plots.py               # figures -> figures/
```

Always smoke-test on a few hundred rows before the full sweep. The join and the
per-clip runtime are only knowable by running it.

## Caching

The dataset and models are cached in `~/.cache/huggingface` on first download
(~615 MB dataset, ~2.4 GB wav2vec2, ~2.9 GB Whisper) and reused on every later
run, so re-running never re-downloads. Load the dataset by downloading its
parquet directly, not through `load_dataset(streaming=True)`, which hangs on
this corpus.

## Files

Runnable scripts live in `scripts/`, fitted artifacts in `data/`, rendered figures in `figures/`, and the write-ups at this root.

- `scripts/measure.py`: GPU sweep, pairs each phoneme's GOP with its human label.
- `scripts/analyze.py`: fits the per-phoneme baselines and writes `data/baselines.json`.
- `scripts/validate.py`: applies the shipped thresholds to the held-out split.
- `scripts/plots.py`: draws the case-study figures into `figures/`.
- `scripts/contrast_eval.py`: separate minimal-pair verdict eval, writes `data/contrast_eval.json`.
- `scripts/contrast_plots.py`: draws the verdict-error figure into `figures/`.
- `scripts/fluency_eval.py`: fits the reference-free fluency model, writes `data/fluency_model.json` and `data/fluency_pairs.jsonl`.
- `scripts/fluency_plots.py`: draws the fluency-fit figure into `figures/` from the dump.
- `data/distributions.json`: per-phoneme good-vs-bad GOP summary.
- `data/baselines.json`: the fitted table, source of `phoneme_baselines.py`.
- `data/pairs*.jsonl`: raw measured pairs, gitignored, rebuilt by a `scripts/measure.py` re-run.
- `CONTRAST_EVAL.md`: findings for the minimal-pair verdict eval.
- `FLUENCY_EVAL.md`: method and findings for the fluency fit.
- `CASE_STUDY.md`: the write-up, in editorial voice, embedding the figures.
