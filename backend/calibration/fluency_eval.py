"""Fit the reference-free fluency model against speechocean762's utterance
fluency labels. Runs the shared Whisper transcriber over each clip for word
timings, extracts the same four features the app scores on, and fits a linear map
from standardized features to the human 0-10 fluency label rescaled to 0-100.

Unlike the phoneme-flag harness (`measure.py`), this needs Whisper: fluency is a
delivery measure with no reference text to align against, so the word timings
must come from transcription, exactly as the runtime gets them. The utterance
`fluency` column is a top-level field in the parquet, so no dataset-loader change
is needed to surface it.

The fit standardizes each feature by its corpus mean and standard deviation,
solves for weights by least squares on a held-in split, and reports correlation
on an untouched held-out split. It writes `fluency_model.json` with the fitted
centers, scales, weights, and intercept, plus the validation metrics, to paste
into `src/diction/scoring/fluency.py`. Scratch tooling, not shipped, not imported
by the app.

Run: PYTHONPATH=src uv run python calibration/fluency_eval.py [n_rows]
"""

import json
import sys
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
from huggingface_hub import hf_hub_download
from tqdm import tqdm

from diction.config import Settings
from diction.scoring.audio import decode_audio
from diction.scoring.fluency import FLUENCY_WEIGHTS, extract_fluency_features
from diction.scoring.transcription import WhisperTranscriber

FEATURE_NAMES = list(FLUENCY_WEIGHTS)
LABEL_SCALE = 10.0  # dataset fluency is 0-10; the app score is 0-100.


def load_rows(split: str, n_rows: int) -> list[dict]:
    path = hf_hub_download(
        'mispeech/speechocean762',
        f'data/{split}-00000-of-00001.parquet',
        repo_type='dataset',
    )
    table = pq.read_table(path, columns=['fluency', 'audio'])
    return table.slice(0, n_rows).to_pylist()


def collect_samples(
    transcriber: WhisperTranscriber, rows: list[dict], desc: str
) -> tuple[np.ndarray, np.ndarray]:
    features: list[list[float]] = []
    labels: list[float] = []
    for row in tqdm(rows, desc=desc, unit='clip'):
        try:
            audio = row['audio']['bytes']
            spans = [(start, end) for _, start, end in transcriber.word_timings(audio)]
            duration = decode_audio(audio).duration
            extracted = extract_fluency_features(spans, duration)
            if extracted is None:
                continue
            features.append([getattr(extracted, name) for name in FEATURE_NAMES])
            labels.append(float(row['fluency']) / LABEL_SCALE * 100.0)
        except Exception as error:  # noqa: BLE001 - harness, log and continue
            tqdm.write(f'skipped: {type(error).__name__}: {error}')
    return np.array(features), np.array(labels)


def standardize(
    features: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    centers = features.mean(axis=0)
    scales = features.std(axis=0)
    scales[scales == 0.0] = 1.0
    return (features - centers) / scales, centers, scales


def fit(standardized: np.ndarray, labels: np.ndarray) -> tuple[np.ndarray, float]:
    design = np.column_stack([standardized, np.ones(len(standardized))])
    solution, *_ = np.linalg.lstsq(design, labels, rcond=None)
    return solution[:-1], float(solution[-1])


def correlation(
    features: np.ndarray,
    labels: np.ndarray,
    centers: np.ndarray,
    scales: np.ndarray,
    weights: np.ndarray,
    intercept: float,
) -> float:
    predicted = ((features - centers) / scales) @ weights + intercept
    predicted = np.clip(predicted, 0.0, 100.0)
    return float(np.corrcoef(predicted, labels)[0, 1])


def main() -> None:
    n_rows = int(sys.argv[1]) if len(sys.argv) > 1 else 2500
    transcriber = WhisperTranscriber(Settings())

    fit_features, fit_labels = collect_samples(
        transcriber, load_rows('test', n_rows), desc='test split (fit)'
    )
    print(f'\nfit samples: {len(fit_labels)}')

    standardized, centers, scales = standardize(fit_features)
    weights, intercept = fit(standardized, fit_labels)

    train_corr = correlation(
        fit_features, fit_labels, centers, scales, weights, intercept
    )
    print(f'in-sample correlation: {train_corr:.3f}')

    holdout_features, holdout_labels = collect_samples(
        transcriber, load_rows('train', n_rows), desc='train split (held-out)'
    )
    holdout_corr = correlation(
        holdout_features, holdout_labels, centers, scales, weights, intercept
    )
    print(f'held-out samples: {len(holdout_labels)}')
    print(f'held-out correlation: {holdout_corr:.3f}')

    model = {
        'intercept': round(intercept, 4),
        'weights': {
            name: {
                'center': round(float(centers[i]), 4),
                'scale': round(float(scales[i]), 4),
                'weight': round(float(weights[i]), 4),
            }
            for i, name in enumerate(FEATURE_NAMES)
        },
        'validation': {
            'in_sample_correlation': round(train_corr, 4),
            'held_out_correlation': round(holdout_corr, 4),
            'fit_samples': len(fit_labels),
            'held_out_samples': len(holdout_labels),
        },
    }
    out = Path(__file__).parent / 'fluency_model.json'
    out.write_text(json.dumps(model, indent=2))
    print(f'\nwrote {out}')
    print('paste the centers, scales, weights, and intercept into')
    print('src/diction/scoring/fluency.py once the held-out correlation validates.')


if __name__ == '__main__':
    main()
