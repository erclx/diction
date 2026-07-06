"""The real GOP scorer. Imports torch, transformers, faster-whisper, and
phonemizer, all in the optional `scoring` dependency group. Kept in its own
module so importing the scorer protocol or the stub never pulls these in.

Models load once at construction, driven from the app lifespan. Inference is
blocking and must run in a threadpool, never inside an async handler, per
`.claude/rules/framework/220-fastapi.md`.
"""

import numpy as np
import torch
import torchaudio.functional
from phonemizer import phonemize
from phonemizer.separator import Separator
from torchaudio.functional import TokenSpan
from transformers import AutoModelForCTC, AutoProcessor

from diction.config import Settings
from diction.scoring.audio import (
    MIN_CLIP_SECONDS,
    TARGET_SAMPLE_RATE,
    ClipTooWeakError,
    decode_audio,
    ensure_scorable,
)
from diction.scoring.gop import (
    AlignedPhoneme,
    aggregate_scores,
    normalize_gop,
)
from diction.scoring.text import normalize_word
from diction.scoring.transcription import WhisperTranscriber
from diction.scoring.types import ContrastResult, ScoreResult


class GopScorer:
    def __init__(self, settings: Settings, transcriber: WhisperTranscriber) -> None:
        self._device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self._processor = AutoProcessor.from_pretrained(settings.phoneme_model_id)
        self._model = (
            AutoModelForCTC.from_pretrained(settings.phoneme_model_id)
            .to(self._device)
            .eval()
        )
        self._transcriber = transcriber

    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        decoded = decode_audio(audio)
        ensure_scorable(decoded, min_seconds=min_clip_seconds)
        waveform = np.frombuffer(decoded.samples.tobytes(), dtype=np.float32)
        duration = decoded.duration

        spoken = self._transcribe(audio)
        emission = self._emission(waveform)
        aligned = self._align(passage, emission, duration)

        expected_words = _normalize_words(passage)
        return aggregate_scores(
            aligned=aligned,
            expected_words=expected_words,
            spoken_words=[word for word, _, _ in spoken],
            spoken_spans=[(start, end) for _, start, end in spoken],
            duration=duration,
        )

    def recognize_word(self, audio: bytes, expected_words: list[str]) -> str:
        """The first intelligible word Whisper hears, normalized, or an empty
        string when it hears nothing. Used to gate a drill rep on word identity
        before scoring, so a clip that is neither word of the pair never earns a
        sound verdict. Decoding is biased toward the two expected words, since
        Whisper gets a short isolated word wrong without that context, but the
        bias does not force a match, so an unrelated word still comes back as
        itself."""
        prompt = f'The word is {expected_words[0]} or {expected_words[1]}.'
        for word, _, _ in self._transcriber.word_timings(audio, prompt=prompt):
            normalized = normalize_word(word)
            if normalized:
                return normalized
        return ''

    def _transcribe(self, audio: bytes) -> list[tuple[str, float, float]]:
        return [
            (normalize_word(word), start, end)
            for word, start, end in self._transcriber.word_timings(audio)
        ]

    def _emission(self, waveform: np.ndarray) -> torch.Tensor:
        inputs = self._processor(
            waveform, sampling_rate=TARGET_SAMPLE_RATE, return_tensors='pt'
        )
        with torch.inference_mode():
            logits = self._model(inputs.input_values.to(self._device)).logits
        return torch.log_softmax(logits.squeeze(0), dim=-1).cpu()

    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult:
        """Judge one minimal-pair rep. Instead of asking whether the target
        sound was acceptable in isolation, compare it against the competing
        sound at its own aligned frames. If the competitor scores higher, the
        speaker produced the wrong sound of the pair."""
        decoded = decode_audio(audio)
        ensure_scorable(decoded, min_seconds=min_clip_seconds)
        waveform = np.frombuffer(decoded.samples.tobytes(), dtype=np.float32)
        emission = self._emission(waveform)

        spans, _ = self._forced_align(word, emission)
        if not spans:
            raise ClipTooWeakError('no phonemes could be aligned to score')
        tokenizer = self._processor.tokenizer
        target_id = tokenizer.convert_tokens_to_ids(target_phoneme)
        competitor_id = tokenizer.convert_tokens_to_ids(competitor_phoneme)

        gops = [float(emission[s.start : s.end, s.token].mean()) for s in spans]
        target_substituted = any(
            float(emission[s.start : s.end, competitor_id].mean())
            > float(emission[s.start : s.end, target_id].mean())
            for s in spans
            if s.token == target_id
        )
        return ContrastResult(
            phoneme_quality=normalize_gop(sum(gops) / len(gops)),
            target_substituted=target_substituted,
        )

    def _align(
        self, passage: str, emission: torch.Tensor, duration: float
    ) -> list[AlignedPhoneme]:
        words = _normalize_words(passage)
        spans, token_word_index = self._forced_align(passage, emission)
        tokenizer = self._processor.tokenizer
        seconds_per_frame = duration / emission.shape[0]
        result: list[AlignedPhoneme] = []
        for span, word_index in zip(spans, token_word_index, strict=True):
            gop = float(emission[span.start : span.end, span.token].mean())
            result.append(
                AlignedPhoneme(
                    word_index=word_index,
                    word=words[word_index],
                    phoneme=tokenizer.convert_ids_to_tokens(span.token),
                    gop=gop,
                    start=span.start * seconds_per_frame,
                    end=span.end * seconds_per_frame,
                )
            )
        return result

    def _forced_align(
        self, passage: str, emission: torch.Tensor
    ) -> tuple[list[TokenSpan], list[int]]:
        """Force-align the passage's phonemes to the audio, returning the merged
        non-blank spans and the word index each span belongs to. A garbled read
        can make alignment fail, which surfaces as unscorable rather than a 500."""
        words = _normalize_words(passage)
        per_word_phonemes = _phonemize(words)
        tokenizer = self._processor.tokenizer

        target_tokens: list[int] = []
        token_word_index: list[int] = []
        for word_index, phonemes in enumerate(per_word_phonemes):
            for phoneme in phonemes:
                token_id = tokenizer.convert_tokens_to_ids(phoneme)
                if token_id is None or token_id == tokenizer.unk_token_id:
                    continue
                target_tokens.append(token_id)
                token_word_index.append(word_index)

        try:
            targets = torch.tensor([target_tokens], dtype=torch.int32)
            aligned_ids, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), targets, blank=tokenizer.pad_token_id
            )
            spans = [
                span
                for span in torchaudio.functional.merge_tokens(
                    aligned_ids[0], scores[0].exp()
                )
                if span.token != tokenizer.pad_token_id
            ]
        except (ValueError, RuntimeError) as error:
            raise ClipTooWeakError(
                'could not align the passage to the audio'
            ) from error
        return spans, token_word_index


def _normalize_words(passage: str) -> list[str]:
    return [normalize_word(word) for word in passage.split()]


def _phonemize(words: list[str]) -> list[list[str]]:
    # The phone separator is load-bearing: without it phonemizer returns one
    # blob per word, every phoneme drops as unknown, and the score is a false
    # pass. See the spike outcome.
    phonemized = phonemize(
        words,
        language='en-us',
        backend='espeak',
        separator=Separator(phone=' ', word='|', syllable=''),
        strip=True,
        with_stress=False,
    )
    return [line.split() for line in phonemized]
