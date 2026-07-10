"""The real LLM practice-content generator. Loads the Ollama client from the
optional `feedback` dependency group, imported lazily so importing this module
never requires the client. It reuses the resident `gemma2:9b` the explainer and
critic already hold, so generation adds no new model or VRAM. The chat call is
blocking network I/O and runs in the threadpool, never inside an async handler,
per `.claude/rules/framework/220-fastapi.md`.

The generated passage is displayed, then synthesized and scored, so the output is
validated at the boundary: an empty or over-long reply degrades to the fixed
fallback passage rather than blanking or overrunning the surface.
"""

import logging
from collections.abc import Mapping
from typing import Protocol, Self, cast

from diction.config import Settings
from diction.feedback.base import (
    MAX_FOCUS_PHONEMES,
    MAX_GENERATED_PASSAGE_LENGTH,
    default_passage,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    'You are an English tutor writing short passages for read-aloud '
    'pronunciation practice. Write one natural English passage of three to five '
    'sentences suitable for reading aloud. Return plain prose only, with no title, '
    'no list, no numbering, no quotation marks around the whole passage, and no '
    'commentary before or after it.'
)


class _ChatMessage(Protocol):
    @property
    def content(self) -> str: ...


class _ChatReply(Protocol):
    @property
    def message(self) -> _ChatMessage: ...


class _ChatClient(Protocol):
    def chat(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        options: Mapping[str, object],
        think: bool,
    ) -> _ChatReply: ...


class OllamaContentGenerator:
    def __init__(self, client: _ChatClient, model_id: str) -> None:
        self._client = client
        self._model_id = model_id

    @classmethod
    def from_settings(cls, settings: Settings) -> Self:
        import ollama

        client = ollama.Client(
            host=settings.ollama_base_url,
            timeout=settings.llm_timeout_seconds,
        )
        return cls(client=cast(_ChatClient, client), model_id=settings.llm_model_id)

    def generate(self, focus_phonemes: list[str]) -> str:
        logger.info(
            'generator.requested',
            extra={'focus_count': len(focus_phonemes), 'model': self._model_id},
        )
        reply = self._client.chat(
            model=self._model_id,
            messages=[
                {'role': 'system', 'content': _SYSTEM_PROMPT},
                {'role': 'user', 'content': _build_prompt(focus_phonemes)},
            ],
            options={'temperature': 0.8, 'num_ctx': 4096},
            think=False,
        )
        return _clean_passage(reply.message.content)


def _build_prompt(focus_phonemes: list[str]) -> str:
    if not focus_phonemes:
        return 'Write a fresh general practice passage.'
    sounds = ', '.join(
        f'/{phoneme}/' for phoneme in focus_phonemes[:MAX_FOCUS_PHONEMES]
    )
    return (
        'Write a passage that naturally uses many words containing these sounds, '
        f'so the reader gets extra practice on them: {sounds}. Keep it natural, '
        'not a word list.'
    )


def _clean_passage(content: str) -> str:
    cleaned = ' '.join(content.split())
    if not cleaned:
        logger.warning('generator.reply was empty; falling back to the passage default')
        return default_passage()
    if len(cleaned) > MAX_GENERATED_PASSAGE_LENGTH:
        logger.warning('generator.reply exceeded the length cap; falling back')
        return default_passage()
    return cleaned
