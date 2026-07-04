from fastapi import APIRouter
from pydantic import BaseModel

from diction.drills.minimal_pairs_data import (
    MINIMAL_PAIR_CONTRASTS,
    MinimalPairContrast,
)

router = APIRouter(tags=['minimal-pairs'])


class WordPairResponse(BaseModel):
    word_a: str
    word_b: str


class MinimalPairContrastResponse(BaseModel):
    phoneme_a: str
    phoneme_b: str
    label: str
    pairs: list[WordPairResponse]


def _to_response(contrast: MinimalPairContrast) -> MinimalPairContrastResponse:
    return MinimalPairContrastResponse(
        phoneme_a=contrast.phoneme_a,
        phoneme_b=contrast.phoneme_b,
        label=contrast.label,
        pairs=[
            WordPairResponse(word_a=pair.word_a, word_b=pair.word_b)
            for pair in contrast.pairs
        ],
    )


@router.get('/minimal-pairs')
def read_minimal_pairs(
    phoneme: str | None = None,
) -> list[MinimalPairContrastResponse]:
    contrasts = [
        contrast
        for contrast in MINIMAL_PAIR_CONTRASTS
        if phoneme is None or phoneme in (contrast.phoneme_a, contrast.phoneme_b)
    ]
    return [_to_response(contrast) for contrast in contrasts]
