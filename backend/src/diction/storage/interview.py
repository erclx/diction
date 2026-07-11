from sqlmodel import Session, col, select

from diction.db.models import InterviewMetrics


def save_interview_metrics(
    session: Session, metrics: InterviewMetrics
) -> InterviewMetrics:
    session.add(metrics)
    session.commit()
    session.refresh(metrics)
    return metrics


def get_interview_metrics_by_session(
    session: Session, session_id: int
) -> InterviewMetrics | None:
    statement = select(InterviewMetrics).where(
        col(InterviewMetrics.session_id) == session_id
    )
    return session.exec(statement).first()
