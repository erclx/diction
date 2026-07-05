"""Calibration harness. Runs the real wav2vec2 GOP over speechocean762 and
pairs each contrast phoneme's GOP with its human accuracy label, so we can see
per-phoneme separation between good and degraded renderings.

Whisper is skipped: calibration aligns against the known reference text, so only
the wav2vec2 emission and forced alignment are needed. Scratch, not shipped.

Run: uv run python ../.claude/.tmp/score-calibration/measure.py [n_rows]
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
from huggingface_hub import hf_hub_download

from diction.config import Settings
from diction.scoring.audio import decode_audio
from diction.scoring.scorer_gop import GopScorer

# espeak IPA tokens for the minimal-pair contrast set the drill trains. Kept
# only to tag which measured phonemes are the drill's contrast phonemes.
CONTRAST = {'θ', 'ð', 'ɹ', 'ɪ', 'iː', 'æ', 'ɛ', 'v', 'w', 's', 'ʃ', 'f'}

# ARPABET (stress digit stripped) to the espeak IPA token the scorer emits.
# Best-effort: a wrong or missing entry only drops that phoneme's data, since
# the join keeps only phonemes that match a scorer token exactly and appear
# once, so a mismatch never mis-pairs. Diphthongs are intentionally omitted;
# espeak segments them variably and they are not in the drill.
ARPABET_TO_IPA = {
    'AA': 'ɑː',
    'AE': 'æ',
    'AH': 'ə',
    'AO': 'ɔː',
    'EH': 'ɛ',
    'ER': 'ɜː',
    'IH': 'ɪ',
    'IY': 'iː',
    'UH': 'ʊ',
    'UW': 'uː',
    'B': 'b',
    'CH': 'tʃ',
    'D': 'd',
    'DH': 'ð',
    'F': 'f',
    'G': 'ɡ',
    'HH': 'h',
    'JH': 'dʒ',
    'K': 'k',
    'L': 'l',
    'M': 'm',
    'N': 'n',
    'NG': 'ŋ',
    'P': 'p',
    'R': 'ɹ',
    'S': 's',
    'SH': 'ʃ',
    'T': 't',
    'TH': 'θ',
    'V': 'v',
    'W': 'w',
    'Y': 'j',
    'Z': 'z',
    'ZH': 'ʒ',
}


def strip_stress(phone: str) -> str:
    return phone.rstrip('0123456789')


def dataset_word_ipa(phones: list[str]) -> list[str | None]:
    return [ARPABET_TO_IPA.get(strip_stress(p)) for p in phones]


def collect_pairs(scorer: GopScorer, text: str, words: list[dict], audio: bytes):
    """Yield (phoneme, gop, accuracy) for each contrast phoneme that appears
    exactly once in both the scorer's alignment and the dataset labels for the
    same word. The single-occurrence guard sidesteps lexicon mismatch between
    espeak and the dataset's canonical phones."""
    decoded = decode_audio(audio)
    waveform = np.frombuffer(decoded.samples.tobytes(), dtype=np.float32)
    emission = scorer._emission(waveform)
    aligned = scorer._align(text, emission, decoded.duration)

    scorer_by_word: dict[int, list] = defaultdict(list)
    for phoneme in aligned:
        scorer_by_word[phoneme.word_index].append(phoneme)

    for word_index, word in enumerate(words):
        scorer_phones = scorer_by_word.get(word_index, [])
        scorer_ipa = [p.phoneme for p in scorer_phones]
        data_ipa = dataset_word_ipa(word['phones'])
        data_acc = word['phones-accuracy']
        for target in set(scorer_ipa):
            if scorer_ipa.count(target) != 1:
                continue
            data_positions = [i for i, ipa in enumerate(data_ipa) if ipa == target]
            if len(data_positions) != 1:
                continue
            gop = scorer_phones[scorer_ipa.index(target)].gop
            accuracy = data_acc[data_positions[0]]
            yield target, gop, accuracy


def main() -> None:
    n_rows = int(sys.argv[1]) if len(sys.argv) > 1 else 2500
    split = sys.argv[2] if len(sys.argv) > 2 else 'test'
    path = hf_hub_download(
        'mispeech/speechocean762',
        f'data/{split}-00000-of-00001.parquet',
        repo_type='dataset',
    )
    table = pq.read_table(path, columns=['text', 'words', 'audio'])
    rows = table.slice(0, n_rows).to_pylist()

    scorer = GopScorer(Settings())

    by_phoneme: dict[str, dict[str, list[float]]] = defaultdict(
        lambda: {'good': [], 'bad': []}
    )
    raw_path = Path(__file__).parent / f'pairs-{split}.jsonl'
    raw = raw_path.open('w')
    scored = 0
    for i, row in enumerate(rows):
        try:
            for phoneme, gop, accuracy in collect_pairs(
                scorer, row['text'], row['words'], row['audio']['bytes']
            ):
                bucket = 'good' if accuracy >= 2.0 else 'bad'
                by_phoneme[phoneme][bucket].append(gop)
                raw.write(
                    json.dumps({'phoneme': phoneme, 'gop': gop, 'accuracy': accuracy})
                    + '\n'
                )
            scored += 1
        except Exception as error:  # noqa: BLE001 - harness, log and continue
            print(f'  row {i} skipped: {type(error).__name__}: {error}')
        if (i + 1) % 200 == 0:
            print(f'  {i + 1}/{len(rows)} clips scored')

    summary = {}
    print(f'\nScored {scored}/{len(rows)} clips. Per-phoneme GOP (good vs bad):\n')
    print(
        f'{"ph":<4}{"n_good":>7}{"n_bad":>6}{"good_mean":>11}{"bad_mean":>10}'
        f'{"good_p10":>10}{"bad_p90":>9}{"separation":>12}'
    )
    for phoneme in sorted(by_phoneme):
        good = by_phoneme[phoneme]['good']
        bad = by_phoneme[phoneme]['bad']
        if len(good) + len(bad) < 30:
            continue
        entry = {
            'n_good': len(good),
            'n_bad': len(bad),
            'good_mean': round(float(np.mean(good)), 3) if good else None,
            'bad_mean': round(float(np.mean(bad)), 3) if bad else None,
            'good_p10': round(float(np.percentile(good, 10)), 3) if good else None,
            'bad_p90': round(float(np.percentile(bad, 90)), 3) if bad else None,
        }
        summary[phoneme] = entry
        sep = round(entry['good_mean'] - entry['bad_mean'], 3) if good and bad else None
        print(
            f'{phoneme:<4}{len(good):>7}{len(bad):>6}'
            f'{str(entry["good_mean"]):>11}{str(entry["bad_mean"]):>10}'
            f'{str(entry["good_p10"]):>10}{str(entry["bad_p90"]):>9}'
            f'{str(sep):>12}'
        )

    out = Path(__file__).parent / 'distributions.json'
    out.write_text(json.dumps(summary, indent=2))
    print(f'\nwrote {out}')


if __name__ == '__main__':
    main()
