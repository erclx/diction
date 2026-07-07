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

Fit on 988 clips and validated on 986 held-out clips (1000 per split, minus clips
too short to measure). The model correlates with human fluency at 0.40 held-out,
matching the 0.39 in-sample, so it generalizes rather than overfits. A 300-clip
smoke first read 0.24 held-out against 0.49 in-sample, which was undersampling
noise: at 1000 clips the two converge. 0.40 is a real but modest relationship, so
the score reads as directional, a genuine-but-imperfect proxy, not a settled grade.

Two of the four features carry the fit. `articulation_rate` is the dominant,
trustworthy term (weight 5.4 on a 0.85-wps scale around a 2.4-wps center), and
`duration_variation` follows with a small correct-signed weight. These are pasted
into `FLUENCY_WEIGHTS` as fitted.

The two pause features cannot be calibrated on this corpus. speechocean762 is
read-aloud prompted speech, so almost no clip hesitates: the fitted pause centers
are 0.002 and 0.004, essentially zero. With near-zero variance the two collinear
pause features get large opposing weights that cancel, -3.33 for `long_pause_ratio`
against +3.36 for `pause_rate`, and `pause_rate` even lands the wrong sign. Adopting
those raw weights would break real-speech discrimination, and the tiny fitted scales
would explode a real pause into a many-sigma outlier. So the pause terms stay
reasoned: centered at zero, since a fluent read has no long pauses, with real-speech
scales and modest negative weights, so a genuinely halting read is penalized where
the corpus is silent. This is the same discipline the GOP flag and prosody
tolerances follow: calibrate what the data can teach, reason the rest, and label
the whole score directional.

The fitted parameters live in `fluency_model.json`. The `articulation_rate` and
`duration_variation` rows are the source of the shipped weights. The pause rows are
recorded there but not shipped, for the reason above.

## Re-run

Needs the scoring extra plus the harness-only `pyarrow` and `huggingface_hub`
(the phoneme harness pulls these through `datasets`). From `backend/`:

```bash
PYTHONPATH=src uv run --with pyarrow --with huggingface_hub \
  python calibration/fluency_eval.py 300   # smoke test first
PYTHONPATH=src uv run --with pyarrow --with huggingface_hub \
  python calibration/fluency_eval.py 2500  # full fit + validation
```

A `tqdm` progress bar reports transcription throughput and ETA per split, so the
sweep is not run blind.

It transcribes the test split for the fit and the train split for held-out
validation, then writes `fluency_model.json` with the fitted parameters and the
two correlations. Smoke-test on a few hundred rows before the full sweep, since
the per-clip Whisper runtime is only knowable by running it.
