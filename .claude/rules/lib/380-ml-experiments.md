---
description: Data loading, sweeps, fitting, validation, visualization, and reproducibility for offline ML and calibration experiments
paths:
  - 'backend/calibration/**/*.py'
---

# ML EXPERIMENT STANDARDS

## Data loading

- Download a dataset's files directly rather than through a streaming loader, which can hang with no output and no error. For HuggingFace, use `hf_hub_download` plus `pyarrow` over `load_dataset(streaming=True)`.
- Reuse the local model and dataset cache. Large assets download once and persist across runs. Do not re-download or re-run setup that already cached.

## Sweeps

- Smoke-test a small sample end to end before the full run. Confirm the output shape and per-item runtime, then scale.
- Skip pipeline stages the task does not need.
- Show live progress on a long sweep with a flushing progress bar (`tqdm`), not plain `print`s. Piped stdout is block-buffered, so unflushed prints stay invisible until the run exits, leaving a multi-minute sweep running blind.
- Dump raw per-item results to disk from the sweep, so fitting and re-analysis run offline without repeating the expensive pass.

## Fitting and validation

- Fit thresholds and parameters from the data. Do not hand-tune one global constant when per-item baselines differ, and prove they differ before assuming they do not.
- Hold out a split the fit never sees and report the real error rate on it. A number that only holds on the fit data is not a result.

## Visualization

- Present training and validation results as a Markdown report with committed, Python-generated static figures (matplotlib or seaborn), so it renders on GitHub and travels into any page. Prefer this over a hosted artifact or bespoke frontend code.
- Write the report's narrative to `.claude/standards/editorial.md`, not the terse reference voice.
- Tint figures with the project palette where one exists, so they match the product.

## Reproducibility

- Keep the harness, its fitted outputs, and the plot script in the repo with a README covering re-run steps, extra dependencies, and cache reuse. Gitignore raw data that a re-run rebuilds.
