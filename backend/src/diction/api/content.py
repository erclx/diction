import logging
from typing import Annotated, Literal, cast

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field

from diction.feedback.base import ContentGenerator, default_passage

logger = logging.getLogger(__name__)

router = APIRouter(tags=['content'])

MAX_FOCUS_PHONEMES = 12


class GenerateContentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    kind: Literal['passage'] = 'passage'
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
        text=_generate_or_default(generator, payload.focus_phonemes)
    )


def _generate_or_default(generator: ContentGenerator, focus_phonemes: list[str]) -> str:
    try:
        return generator.generate(focus_phonemes)
    except Exception:
        logger.warning(
            'generator failed; returning the fallback passage instead',
            exc_info=True,
        )
        return default_passage()
