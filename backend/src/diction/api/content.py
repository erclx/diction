import logging
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field

from diction.feedback.base import (
    MAX_FOCUS_PHONEMES,
    ContentGenerator,
    ContentKind,
    default_content,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=['content'])


class GenerateContentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    kind: ContentKind = 'passage'
    focus_phonemes: list[str] = Field(
        default_factory=list, max_length=MAX_FOCUS_PHONEMES
    )


class GeneratedContentResponse(BaseModel):
    text: str


def get_generator(request: Request) -> ContentGenerator:
    return cast(ContentGenerator, request.app.state.generator)


@router.post('/content/generate')
def generate_content(
    generator: Annotated[ContentGenerator, Depends(get_generator)],
    payload: GenerateContentRequest,
) -> GeneratedContentResponse:
    return GeneratedContentResponse(
        text=_generate_or_default(generator, payload.kind, payload.focus_phonemes)
    )


def _generate_or_default(
    generator: ContentGenerator, kind: ContentKind, focus_phonemes: list[str]
) -> str:
    try:
        return generator.generate(kind, focus_phonemes)
    except Exception:
        logger.warning(
            'generator failed; returning the fallback %s instead',
            kind,
            exc_info=True,
        )
        return default_content(kind)
