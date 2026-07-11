from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from diction.config import Settings, get_settings
from diction.interview.questions import RehearsalQuestion, load_questions

router = APIRouter(tags=['interview'])


class InterviewQuestion(BaseModel):
    category: str
    question: str
    keyword_beats: list[str]
    scripted_answer: str


def _to_response(question: RehearsalQuestion) -> InterviewQuestion:
    beats = question.keywords.split('\n') if question.keywords else []
    return InterviewQuestion(
        category=question.category,
        question=question.question,
        keyword_beats=beats,
        scripted_answer=question.answer,
    )


@router.get('/interview/questions')
def read_interview_questions(
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[InterviewQuestion]:
    questions = load_questions(settings.interview_source_dir)
    return [_to_response(question) for question in questions]
