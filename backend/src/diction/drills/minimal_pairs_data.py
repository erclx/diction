"""Curated minimal-pair dataset keyed by phoneme contrast.

Every phoneme string here is a raw espeak IPA label, the same alphabet
`scoring/scorer_gop.py` emits via `phonemize(..., backend='espeak')` and the
weak-sound tracker stores. The scorer is the single source of truth: a key that
drifts from what it emits (a prettified or wrong label) makes
`GET /api/minimal-pairs?phoneme=<weak>` return nothing, so a weak sound silently
maps to no drill. Cross-check any new key against the scorer before adding it.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WordPair:
    word_a: str
    word_b: str


@dataclass(frozen=True, slots=True)
class MinimalPairContrast:
    phoneme_a: str
    phoneme_b: str
    label: str
    pairs: tuple[WordPair, ...]


MINIMAL_PAIR_CONTRASTS: tuple[MinimalPairContrast, ...] = (
    MinimalPairContrast(
        phoneme_a='θ',
        phoneme_b='f',
        label='th vs f',
        pairs=(
            WordPair('thin', 'fin'),
            WordPair('thought', 'fought'),
            WordPair('three', 'free'),
            WordPair('sheath', 'sheaf'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='θ',
        phoneme_b='s',
        label='th vs s',
        pairs=(
            WordPair('thin', 'sin'),
            WordPair('thick', 'sick'),
            WordPair('thought', 'sought'),
            WordPair('path', 'pass'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='ð',
        phoneme_b='d',
        label='th vs d',
        pairs=(
            WordPair('they', 'day'),
            WordPair('then', 'den'),
            WordPair('though', 'dough'),
            WordPair('worthy', 'wordy'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='ɹ',
        phoneme_b='l',
        label='r vs l',
        pairs=(
            WordPair('right', 'light'),
            WordPair('road', 'load'),
            WordPair('rice', 'lice'),
            WordPair('pray', 'play'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='ɪ',
        phoneme_b='iː',
        label='short i vs long ee',
        pairs=(
            WordPair('ship', 'sheep'),
            WordPair('bit', 'beat'),
            WordPair('sit', 'seat'),
            WordPair('live', 'leave'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='æ',
        phoneme_b='ɛ',
        label='short a vs short e',
        pairs=(
            WordPair('bad', 'bed'),
            WordPair('bat', 'bet'),
            WordPair('man', 'men'),
            WordPair('pan', 'pen'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='v',
        phoneme_b='w',
        label='v vs w',
        pairs=(
            WordPair('vine', 'wine'),
            WordPair('vest', 'west'),
            WordPair('vet', 'wet'),
            WordPair('veil', 'wail'),
        ),
    ),
    MinimalPairContrast(
        phoneme_a='s',
        phoneme_b='ʃ',
        label='s vs sh',
        pairs=(
            WordPair('sip', 'ship'),
            WordPair('sea', 'she'),
            WordPair('sock', 'shock'),
            WordPair('mass', 'mash'),
        ),
    ),
)
