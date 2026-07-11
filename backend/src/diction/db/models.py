from datetime import UTC, datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class PracticeSession(SQLModel, table=True):
    __tablename__ = 'sessions'

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    mode: str
    passage: str | None = None
    transcript: str | None = None
    critique: str | None = None
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    recording_path: str | None = None

    flagged_words: list['FlaggedWord'] = Relationship(  # noqa: UP037  forward ref, FlaggedWord defined below
        back_populates='session'
    )
    interview_metrics: Optional['InterviewMetrics'] = Relationship(  # noqa: UP037, UP045  Optional forward ref: SQLAlchemy cannot resolve a 'X | None' string, InterviewMetrics defined below
        back_populates='session',
        sa_relationship_kwargs={'uselist': False},
    )


class FlaggedWord(SQLModel, table=True):
    __tablename__ = 'flagged_words'

    id: int | None = Field(default=None, primary_key=True)
    session_id: int | None = Field(default=None, foreign_key='sessions.id', index=True)
    word: str
    phoneme: str
    start: float
    end: float
    explanation: str

    session: PracticeSession | None = Relationship(back_populates='flagged_words')


class InterviewMetrics(SQLModel, table=True):
    __tablename__ = 'interview_metrics'

    id: int | None = Field(default=None, primary_key=True)
    session_id: int | None = Field(default=None, foreign_key='sessions.id', index=True)
    eye_contact_pct: float
    stability: float
    gesture_ratio: float
    shoulder_tilt_deg: float

    session: PracticeSession | None = Relationship(back_populates='interview_metrics')


class DrillRep(SQLModel, table=True):
    __tablename__ = 'drill_reps'

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    mode: str
    target: str
    passed: bool | None = None
    score: float | None = None
