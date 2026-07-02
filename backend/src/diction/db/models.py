from datetime import UTC, datetime

from sqlmodel import Field, Relationship, SQLModel


class Session(SQLModel, table=True):
    __tablename__ = 'sessions'

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    mode: str
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float

    flagged_words: list['FlaggedWord'] = Relationship(  # noqa: UP037  forward ref, FlaggedWord defined below
        back_populates='session'
    )


class FlaggedWord(SQLModel, table=True):
    __tablename__ = 'flagged_words'

    id: int | None = Field(default=None, primary_key=True)
    session_id: int | None = Field(default=None, foreign_key='sessions.id', index=True)
    word: str
    explanation: str

    session: Session | None = Relationship(back_populates='flagged_words')
