# Fluency-score calibration

Whether a reference-free fluency built from word timings tracks human fluency
judgments, fit against speechocean762's utterance fluency labels and validated on
a held-out split.

## Why it exists

The passage score's `fluency` first shipped as a placeholder: `100 * (1 - pause
ratio)` over the forced-aligned word spans. Those spans are near-contiguous, so
the pause ratio was near-zero and the score read 100 for almost every clip,
whether the delivery was smooth or halting. Its own docstring said to replace it
"when the prosody features land", which v0.5 delivered. This harness fits a real
measure the same way the phoneme flag was fit: against speechocean762, on a
held-out split, so the score is trustworthy rather than hand-tuned.

## Method

Fluency has no reference text to align against, so the features come from the same
shared Whisper word timings the runtime uses, not the forced-aligned spans. Four
reference-free features per clip, in `src/diction/scoring/fluency.py`:

- articulation rate: words per second of articulated speech
- long-pause ratio: fraction of the clip spent in hesitation pauses (gaps past
  `LONG_PAUSE_SECONDS`)
- pause rate: hesitation pauses per word
- duration variation: coefficient of variation of word durations, the same
  per-word-duration rhythm signal `prosody.py` scores

Each feature is standardized by its corpus mean and standard deviation, and a
linear map from the standardized features to the human 0-10 fluency label,
rescaled to 0-100, is fit by least squares on the test split. It is validated by
correlation against the untouched train split. The utterance `fluency` column is a
top-level field in the parquet, so no dataset-loader change is needed to read it.

A linear model was chosen over a single-feature monotonic map because fluency is
not one signal: a clip can be fast but choppy, or slow but even. It stays low
parameter (four features, an intercept) so it does not overfit the label noise.

## Findings

Pending the GPU run. `fluency_eval.py` transcribes with Whisper, which is
GPU-bound and runs on the 5090, not in CI. The shipped model in
`src/diction/scoring/fluency.py` carries placeholder centers, scales, and weights
on the same footing as the prosody tolerances: the sign of each weight is set by
what fluency means (faster and more even reads higher, more pauses lower), and the
intercept is set so a typical even read lands in the 80s rather than pinning at 100. Until the held-out correlation validates, the score is directional, not a
settled grade, and the passage surface presents it as such.

When the fit runs, paste the fitted centers, scales, weights, and intercept from
`fluency_model.json` into `FLUENCY_WEIGHTS` and `FLUENCY_INTERCEPT`, and replace
this section with the in-sample and held-out correlation.

## Re-run

Needs the scoring extra. From `backend/`:

```bash
PYTHONPATH=src uv run python calibration/fluency_eval.py 300   # smoke test first
PYTHONPATH=src uv run python calibration/fluency_eval.py 2500  # full fit + validation
```

It transcribes the test split for the fit and the train split for held-out
validation, then writes `fluency_model.json` with the fitted parameters and the
two correlations. Smoke-test on a few hundred rows before the full sweep, since
the per-clip Whisper runtime is only knowable by running it.
