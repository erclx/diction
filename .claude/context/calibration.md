---
title: Calibration
description: Offline experiment that fits the pronunciation-flag thresholds from speechocean762, its harness, method, and findings
---

# Calibration

The offline supervised-learning experiment that sets the pronunciation-flag thresholds the scorer ships. It runs the real wav2vec2 GOP over labeled recordings, fits a per-phoneme threshold, and validates on held-out data. The runtime side of the result lives in `.claude/context/scoring.md`. The public write-up is `backend/calibration/CASE_STUDY.md`, and the re-run steps are in `backend/calibration/README.md`.

## Layer responsibilities

- `backend/calibration/` owns the harness: `measure.py` runs the GPU sweep, `analyze.py` fits, `validate.py` checks on held-out data, `plots.py` draws the figures.
- `backend/calibration/baselines.json` and `distributions.json` own the fitted data. `src/diction/scoring/phoneme_baselines.py` is the shipped table the app imports, generated from `baselines.json`.
- The harness stays out of `src/` because it is offline tooling with research-only dependencies (`matplotlib`, `seaborn`, `datasets`) the app never imports. The result belongs in `src`, the experiment does not.

## Decisions

- The dataset is speechocean762, adopted after evaluation. Apache-2.0, also on OpenSLR resource 101. 5000 utterances from 250 non-native Mandarin-L1 speakers, every phoneme scored 0 to 2 by five experts. That per-phoneme label is the ground truth a threshold fits against.
- The flag is per-phoneme, not one global cutoff. Native GOP baselines differ sharply by phoneme, so `gop.py` flags a phoneme when its GOP falls more than `FLAG_K` (1.6) standard deviations below its own native mean. `FLAG_K` favors few false flags on native speech.
- `normalize_gop`'s slope is set to 10 from the measured clean-versus-wrong GOP spread.
- Whisper is skipped in the harness. Calibration aligns against the known reference text, so only the acoustic model runs, which turns an hours-long sweep into minutes.
- The fit uses the test split and is validated on the untouched train split. Held out, it false-flags native speech 7.0% of the time and catches 66% of clear errors.

## Hidden contracts

- The join between scorer and dataset keys on phonemes that appear exactly once in both a word's espeak-IPA sequence (from the scorer) and its ARPABET sequence (from the dataset, mapped to IPA). The single-occurrence guard sidesteps lexicon mismatch, so a wrong map entry drops that phoneme's data rather than mis-pairing it.
- Fitting buckets are clean (human accuracy 2) versus clearly wrong (accuracy at most 1). The borderline middle between them is left out of the fit.
- A phoneme earns a flag only if it clears the reliability gate, an AUC of at least 0.75. A phoneme absent from `phoneme_baselines.py` is uncalibrated and never flags.

## Gotchas

- Load the dataset by downloading its parquet directly with `hf_hub_download` and `pyarrow`. `load_dataset(streaming=True)` hung on this corpus, pulling a few KB then stalling with no output and no error.
- There are no truly native speakers in the corpus. The clean baseline comes from accuracy-2 phonemes, not native reference recordings, and that limit is worth remembering before trusting an absolute baseline.
- An earlier spike concluded vowels like `iː` could not separate. That was an artifact of comparing clean speech against borderline reads. Against clearly-wrong reads every phoneme separates, `iː` at an AUC of 0.98.
- Sources: the [speechocean762 dataset card](https://huggingface.co/datasets/mispeech/speechocean762) and the [corpus paper](https://ar5iv.labs.arxiv.org/html/2104.01378).
