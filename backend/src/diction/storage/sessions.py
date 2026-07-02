from sqlmodel import Session, col, select

from diction.db import models


def save_session(session: Session, record: models.Session) -> models.Session:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_session_by_id(session: Session, session_id: int) -> models.Session | None:
    return session.get(models.Session, session_id)


def list_sessions(session: Session) -> list[models.Session]:
    statement = select(models.Session).order_by(
        col(models.Session.created_at).desc(),
        col(models.Session.id).desc(),
    )
    return list(session.exec(statement).all())
