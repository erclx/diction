"""Parse the user's `me/questions.md` schema into rehearsal questions.

Schema: `## category` groups, `### "question"` per question, `-` keyword-beat
bullets, and a `>` blockquote scripted answer. Content is drop-in data the
operator owns, read from a directory configured by env, never a path baked in.
"""

import logging
import re
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

_UNREADABLE_FILE_ERRORS = (OSError, UnicodeError)


@dataclass(frozen=True, slots=True)
class RehearsalQuestion:
    category: str
    question: str
    keywords: str
    answer: str


def _strip_quotes(text: str) -> str:
    if len(text) >= 2 and text.startswith('"') and text.endswith('"'):
        return text[1:-1]
    return text


def _strip_frontmatter(raw: str) -> str:
    if raw.startswith('---\n'):
        end = raw.find('\n---', 3)
        if end != -1:
            newline = raw.find('\n', end + 1)
            return raw[newline + 1 :] if newline != -1 else ''
    return raw


def extract_questions(body: str) -> list[RehearsalQuestion]:
    questions: list[RehearsalQuestion] = []
    category = ''
    question: str | None = None
    beats: list[str] = []
    answer: list[str] = []

    def flush() -> None:
        nonlocal question, beats, answer
        if question is None:
            return
        questions.append(
            RehearsalQuestion(
                category=category,
                question=question,
                keywords='\n'.join(beats),
                answer='\n'.join(answer).strip(),
            )
        )
        question, beats, answer = None, [], []

    for line in body.split('\n'):
        if line.startswith('### '):
            flush()
            question = _strip_quotes(line[4:].strip())
            continue
        if line.startswith('## '):
            flush()
            category = line[3:].strip()
            continue
        if question is None:
            continue
        if line.startswith('- '):
            beats.append(line[2:].strip())
            continue
        if line.startswith('>'):
            answer.append(re.sub(r'^>\s?', '', line))
    flush()
    return questions


def parse_file(path: Path) -> list[RehearsalQuestion]:
    raw = path.read_text(encoding='utf8')
    return extract_questions(_strip_frontmatter(raw))


def load_questions(source_dir: Path | None) -> list[RehearsalQuestion]:
    if source_dir is None:
        return []
    if not source_dir.is_dir():
        logger.warning('interview source dir is not a directory: %s', source_dir)
        return []

    questions: list[RehearsalQuestion] = []
    for path in sorted(source_dir.glob('*.md')):
        try:
            parsed = parse_file(path)
        except _UNREADABLE_FILE_ERRORS:
            logger.warning(
                'skipping unreadable interview file: %s', path, exc_info=True
            )
            continue
        if not parsed:
            logger.warning('skipping interview file with no questions: %s', path)
            continue
        questions.extend(parsed)
    return questions
