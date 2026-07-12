from dataclasses import dataclass

from sqlmodel import Session, col, select

from diction.db.models import FlaggedWord, InterviewMetrics, PracticeSession


@dataclass(frozen=True, slots=True)
class DeletedSession:
    recording_path: str | None


def save_session(session: Session, record: PracticeSession) -> PracticeSession:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_session_by_id(session: Session, session_id: int) -> PracticeSession | None:
    return session.get(PracticeSession, session_id)


def list_sessions(session: Session) -> list[PracticeSession]:
    statement = select(PracticeSession).order_by(
        col(PracticeSession.created_at).desc(),
        col(PracticeSession.id).desc(),
    )
    return list(session.exec(statement).all())


def delete_session(session: Session, session_id: int) -> DeletedSession | None:
    record = session.get(PracticeSession, session_id)
    if record is None:
        return None
    recording_path = record.recording_path
    flagged_words = session.exec(
        select(FlaggedWord).where(col(FlaggedWord.session_id) == session_id)
    ).all()
    for word in flagged_words:
        session.delete(word)
    metrics = session.exec(
        select(InterviewMetrics).where(col(InterviewMetrics.session_id) == session_id)
    ).first()
    if metrics is not None:
        session.delete(metrics)
    session.delete(record)
    session.commit()
    return DeletedSession(recording_path=recording_path)
