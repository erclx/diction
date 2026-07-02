from sqlmodel import Session, col, select

from diction.db.models import PracticeSession


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
