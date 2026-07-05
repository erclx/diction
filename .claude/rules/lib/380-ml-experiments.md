---
description: Data loading, sweep, fitting, and reproducibility standards for offline ML and calibration experiments
paths:
  - 'backend/calibration/**/*.py'
---

# ML EXPERIMENT STANDARDS

## Data loading

- Load a HuggingFace dataset by downloading its parquet directly (`hf_hub_download` plus `pyarrow`), not `load_dataset(..., streaming=True)`, which can hang with no output and no error.
- Reuse the HuggingFace cache at `~/.cache/huggingface`. Models and datasets download once and persist across runs. Do not re-download or re-run setup that already cached.

## Sweeps

- Smoke-test a small sample (a few hundred rows) end to end before the full sweep. Confirm the output shape and per-item runtime, then scale.
- Skip pipeline stages the task does not need. Calibrating against known reference text needs the acoustic model only, not transcription.
- Dump raw per-item results to disk from the sweep, so fitting and re-analysis run offline without repeating the GPU pass.

## Fitting and validation

- Fit thresholds from the data. Do not hand-tune one global constant when per-item baselines differ, and prove they differ before assuming they do not.
- Hold out a split the fit never sees and report the real error rate on it. A number that only holds on the fit data is not calibration.

## Reproducibility

- Keep the harness and its fitted outputs in the repo with a README covering re-run steps, extra dependencies, and cache reuse. Gitignore regenerable raw data.
