# speechocean762 evaluation

Resolves the "speechocean762 fit-and-licensing" open question from
`ARCHITECTURE.md` and the calibration plan. Decision: **adopt it.**

## License

- Apache-2.0 on HuggingFace (`mispeech/speechocean762`).
- Also mirrored free on OpenSLR, resource 101.
- Permits research use and redistribution. No blocker.

## Label granularity (fits)

- 5,000 utterances, 250 non-native speakers (Mandarin L1), 2.5k/2.5k train/test.
- Five expert annotators score every utterance at sentence, word, and phoneme level.
- Per-phoneme accuracy score on a 0-2 scale, each with its canonical phone
  and a mispronunciation flag.
- This is the ground truth calibration needs: run our wav2vec2 GOP over the
  audio, then fit our flag threshold and `normalize_gop` against the human
  per-phoneme accuracy labels.

## Caveats to carry as risks

1. Phone-set mismatch. Dataset labels are ARPABET (`TH`, `R`, `IH`, `IY`).
   Our scorer emits espeak IPA (`θ`, `ɹ`, `ɪ`, `iː`) via
   `phonemize(..., separator=Separator(phone=' '))`. Need an ARPABET to
   espeak-IPA mapping to join labels to scorer tokens. Standard table, but a
   real step and an error source.
2. No truly native speakers. All 250 are non-native. Use the high-scored
   (accuracy=2) phonemes as the clean baseline rather than native reference
   recordings.

## Next steps (on the calibration branch, off main, not the interim branch)

1. `uv sync --extra scoring` to install the model stack in the backend venv.
2. Pull the dataset (`datasets.load_dataset('mispeech/speechocean762')`).
3. Build the ARPABET to espeak-IPA phone map for the contrast set
   (`θ ð ɹ ɪ iː æ ɛ v w s ʃ f`).
4. Run the real GOP scorer over the audio, bucket GOP by (phoneme,
   human-accuracy) to measure per-phoneme native-vs-substituted separation.
5. Pick the threshold model (normalized z-score vs per-phoneme table),
   recalibrate `normalize_gop`, hold out one contrast to check generalization.

## Sources

- https://huggingface.co/datasets/mispeech/speechocean762
- https://ar5iv.labs.arxiv.org/html/2104.01378

## Fitted result (2026-07-06)

- Model: per-phoneme normalized flag. Flag when GOP < mean - K*std, K=1.6.
  Baselines fitted on the test split (2500 clips), 27 phonemes, all AUC>=0.83.
- normalize_gop slope set to 10 (clean median GOP -0.13 -> ~99, wrong -6.34 -> ~37).
- Key finding: comparing clean (acc=2) vs clearly-wrong (acc<=1), GOP separates
  well for ALL phonemes incl. iː (AUC 0.98). The earlier "vowels don't separate"
  was an artifact of bucketing borderline (1.x) renderings as bad.
- Held-out validation on the train split (never fit): 7.0% false-flag on native,
  66% catch of clear errors. Thresholds generalize.
- Harness: measure.py (GPU sweep), analyze.py (fit), validate.py (held-out).
