"""Minimal-pair verdict evaluation. Measures whether the production-drill
verdict can tell the target sound of a contrast from its competitor, across the
whole curated drill set.

Two verdicts are compared per clip:

- old: the absolute per-phoneme flag (does the target phoneme fall below its own
  native GOP band). This is what the drill shipped with before the competitor
  check.
- new: the competitor-aware check in `GopScorer.score_target_contrast` (does the
  competing phoneme score higher than the target at the target's own frames).

Each pair is scored twice: the correct word (should pass) and the competing word
(should retry). Clips are synthesized with the shipped Piper voice, so this is a
clean-speech proxy, not real learner audio. A correct clip that retries is an
annoyance; a wrong clip that passes teaches the wrong sound, so false passes are
the error that matters.

Harness-only, not imported by the app. Needs the scoring and tts extras and a
GPU helps.

Run from `backend/`: PYTHONPATH=src uv run python calibration/contrast_eval.py
"""

import json
from pathlib import Path

from diction.config import Settings
from diction.drills.minimal_pairs_data import MINIMAL_PAIR_CONTRASTS
from diction.scoring.audio import MIN_WORD_CLIP_SECONDS, ClipTooWeakError
from diction.scoring.scorer_gop import GopScorer
from diction.scoring.text import normalize_word
from diction.scoring.transcription import WhisperTranscriber
from diction.tts.synth_piper import PiperSynthesizer

HERE = Path(__file__).parent

DECOY_WORDS = ('rabbit', 'table', 'orange')


def _old_verdict(scorer: GopScorer, word: str, audio: bytes, target: str) -> bool:
    """The pre-competitor flag: retry when the target phoneme flags on its own
    native band."""
    result = scorer.score(word, audio, min_clip_seconds=MIN_WORD_CLIP_SECONDS)
    return any(flag.phoneme == target for flag in result.flagged_words)


def _new_verdict(
    scorer: GopScorer, word: str, audio: bytes, target: str, competitor: str
) -> bool:
    result = scorer.score_target_contrast(
        word,
        audio,
        target_phoneme=target,
        competitor_phoneme=competitor,
        min_clip_seconds=MIN_WORD_CLIP_SECONDS,
    )
    return result.target_substituted


def main() -> None:
    settings = Settings(use_stub_scorer=False, use_stub_synth=False)
    scorer = GopScorer(settings, WhisperTranscriber(settings))
    synth = PiperSynthesizer(settings)

    clips: dict[str, bytes] = {}

    def clip(word: str) -> bytes:
        if word not in clips:
            clips[word] = synth.synthesize(word)
        return clips[word]

    rows = []
    tally = {'old_fp': 0, 'new_fp': 0, 'old_fr': 0, 'new_fr': 0, 'errors': 0}
    for contrast in MINIMAL_PAIR_CONTRASTS:
        ta, co, label = contrast.phoneme_a, contrast.phoneme_b, contrast.label
        for pair in contrast.pairs:
            for kind, spoken in (('correct', pair.word_a), ('wrong', pair.word_b)):
                expect_retry = kind == 'wrong'
                try:
                    audio = clip(spoken)
                    old_retry = _old_verdict(scorer, pair.word_a, audio, ta)
                    new_retry = _new_verdict(scorer, pair.word_a, audio, ta, co)
                except ClipTooWeakError:
                    tally['errors'] += 1
                    rows.append(
                        {
                            'label': label,
                            'target': ta,
                            'word': pair.word_a,
                            'spoken': spoken,
                            'kind': kind,
                            'error': 'clip_too_weak',
                        }
                    )
                    continue
                tally['old_fp'] += int(expect_retry and not old_retry)
                tally['new_fp'] += int(expect_retry and not new_retry)
                tally['old_fr'] += int(not expect_retry and old_retry)
                tally['new_fr'] += int(not expect_retry and new_retry)
                rows.append(
                    {
                        'label': label,
                        'target': ta,
                        'word': pair.word_a,
                        'spoken': spoken,
                        'kind': kind,
                        'old_retry': old_retry,
                        'new_retry': new_retry,
                    }
                )
                mark = 'OK ' if new_retry == expect_retry else '!! '
                print(
                    f'{mark}{label:<18} target {ta:<2} '
                    f"say '{spoken}' ({kind:<7}) "
                    f'old={"RETRY" if old_retry else "pass":<5} '
                    f'new={"RETRY" if new_retry else "pass"}'
                )

    print('\n=== error counts across all pairs ===')
    print(
        f'  false PASS  (wrong word, verdict pass) : '
        f'old {tally["old_fp"]:>2}  ->  new {tally["new_fp"]:>2}'
    )
    print(
        f'  false RETRY (right word, verdict retry): '
        f'old {tally["old_fr"]:>2}  ->  new {tally["new_fr"]:>2}'
    )
    print(f'  unscorable clips (too weak/short)      : {tally["errors"]}')

    recognition = _recognition_check(scorer, clip)

    out = HERE / 'contrast_eval.json'
    out.write_text(
        json.dumps(
            {'tally': tally, 'rows': rows, 'recognition': recognition},
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f'\nwrote {out}')


def _recognition_check(scorer, clip) -> dict:  # type: ignore[no-untyped-def]
    """Regression guard for the word-identity gate: each drill word, heard with
    its own pair as the bias, should be recognized as one of the pair, and a
    decoy word should still be rejected under that bias. A clean synthetic clip
    is easy for Whisper, so this proves the gate does not block the drill's own
    vocabulary and the bias does not force a false match, not real-speaker
    accuracy."""
    total = 0
    recognized = 0
    for contrast in MINIMAL_PAIR_CONTRASTS:
        for pair in contrast.pairs:
            expected = [pair.word_a, pair.word_b]
            pair_words = {normalize_word(pair.word_a), normalize_word(pair.word_b)}
            for spoken in expected:
                total += 1
                heard = scorer.recognize_word(clip(spoken), expected)
                if heard in pair_words:
                    recognized += 1
                else:
                    print(f"  '{spoken}' (pair {pair_words}) heard as '{heard}'")

    first = MINIMAL_PAIR_CONTRASTS[0].pairs[0]
    decoy_pair = [first.word_a, first.word_b]
    decoy_words = {normalize_word(w) for w in decoy_pair}
    decoys = {d: scorer.recognize_word(clip(d), decoy_pair) for d in DECOY_WORDS}
    leaked = [d for d, heard in decoys.items() if heard in decoy_words]

    print('\n=== word-identity gate ===')
    print(f'  drill words recognized as their pair: {recognized}/{total}')
    print(f'  decoys forced onto a pair           : {len(leaked)} {leaked}')
    return {
        'drill_word_reps': total,
        'recognized': recognized,
        'decoys': decoys,
        'leaked': leaked,
    }


if __name__ == '__main__':
    main()
