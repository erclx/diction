"""The real LLM explainer. Loads the Ollama client from the optional `feedback`
dependency group, imported lazily so importing this module never requires the
client. The client is built once from the app lifespan; the chat call is
blocking network I/O and runs in the threadpool, never inside an async handler,
per `.claude/rules/framework/220-fastapi.md`.
"""

import logging
import re
from collections.abc import Mapping
from typing import Protocol, Self

from diction.config import Settings
from diction.feedback.base import default_explanation
from diction.feedback.types import FlaggedWordContext

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    'You are a pronunciation coach. For each flagged word you are given, write '
    'exactly one short sentence in plain English that names the marked sound and '
    'says how to produce it correctly. Avoid phonetic jargon beyond the sound '
    'itself. Return one line per word, in the same order you were given, with no '
    'numbering, blank lines, or extra commentary.'
)

_NUMBERING = re.compile(r'^\s*\d+[.)]\s*')


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
    ) -> _ChatReply: ...


class OllamaExplainer:
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
        return cls(client=client, model_id=settings.llm_model_id)

    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]:
        if not flagged_words:
            return []
        logger.info(
            'explainer.batch requested',
            extra={'word_count': len(flagged_words), 'model': self._model_id},
        )
        reply = self._client.chat(
            model=self._model_id,
            messages=[
                {'role': 'system', 'content': _SYSTEM_PROMPT},
                {'role': 'user', 'content': _build_prompt(flagged_words)},
            ],
            options={'temperature': 0.2},
        )
        return _parse_reply(reply.message.content, flagged_words)


def _build_prompt(flagged_words: list[FlaggedWordContext]) -> str:
    lines = [
        f"{index}. word '{flag.word}', mispronounced sound /{flag.phoneme}/"
        for index, flag in enumerate(flagged_words, start=1)
    ]
    return 'Flagged words:\n' + '\n'.join(lines)


def _parse_reply(content: str, flagged_words: list[FlaggedWordContext]) -> list[str]:
    lines = [
        _NUMBERING.sub('', line).strip()
        for line in content.splitlines()
        if line.strip()
    ]
    if len(lines) != len(flagged_words):
        logger.warning(
            'explainer.reply line count did not match flagged words; '
            'falling back to the default template',
            extra={'expected': len(flagged_words), 'received': len(lines)},
        )
        return [default_explanation(flag.word, flag.phoneme) for flag in flagged_words]
    return lines
