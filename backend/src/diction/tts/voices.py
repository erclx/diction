"""Curated registry of the English Kokoro voices offered in the picker. Kokoro
exposes no clean list API, so this hand-maintained constant is the single source
of truth for which voice ids are valid, shared by the `/api/voices` route and the
per-request voice validation on the reference and prosody routes.

Non-English voices are omitted per the language non-goal in
`.claude/REQUIREMENTS.md`.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Voice:
    id: str
    label: str
    accent: str
    gender: str


VOICES: tuple[Voice, ...] = (
    Voice('af_heart', 'Heart', 'American', 'Female'),
    Voice('af_bella', 'Bella', 'American', 'Female'),
    Voice('af_nicole', 'Nicole', 'American', 'Female'),
    Voice('af_sarah', 'Sarah', 'American', 'Female'),
    Voice('af_sky', 'Sky', 'American', 'Female'),
    Voice('af_aoede', 'Aoede', 'American', 'Female'),
    Voice('af_kore', 'Kore', 'American', 'Female'),
    Voice('af_nova', 'Nova', 'American', 'Female'),
    Voice('am_michael', 'Michael', 'American', 'Male'),
    Voice('am_fenrir', 'Fenrir', 'American', 'Male'),
    Voice('am_puck', 'Puck', 'American', 'Male'),
    Voice('am_echo', 'Echo', 'American', 'Male'),
    Voice('am_eric', 'Eric', 'American', 'Male'),
    Voice('am_liam', 'Liam', 'American', 'Male'),
    Voice('am_onyx', 'Onyx', 'American', 'Male'),
    Voice('bf_emma', 'Emma', 'British', 'Female'),
    Voice('bf_isabella', 'Isabella', 'British', 'Female'),
    Voice('bf_alice', 'Alice', 'British', 'Female'),
    Voice('bf_lily', 'Lily', 'British', 'Female'),
    Voice('bm_george', 'George', 'British', 'Male'),
    Voice('bm_fable', 'Fable', 'British', 'Male'),
    Voice('bm_lewis', 'Lewis', 'British', 'Male'),
    Voice('bm_daniel', 'Daniel', 'British', 'Male'),
)

VOICE_IDS: frozenset[str] = frozenset(voice.id for voice in VOICES)


def is_known_voice(voice_id: str) -> bool:
    return voice_id in VOICE_IDS
