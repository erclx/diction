from sqlmodel import Session, col, select

from diction.db.models import DrillRep


def save_drill_rep(session: Session, rep: DrillRep) -> DrillRep:
    session.add(rep)
    session.commit()
    session.refresh(rep)
    return rep


def list_drill_reps(session: Session) -> list[DrillRep]:
    statement = select(DrillRep).order_by(
        col(DrillRep.created_at).desc(),
        col(DrillRep.id).desc(),
    )
    return list(session.exec(statement).all())
