from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from diction.api import health, passages
from diction.config import get_settings
from diction.db.engine import create_db_and_tables
from diction.scoring.audio import ClipTooWeakError
from diction.scoring.base import StubScorer

FRONTEND_ORIGIN = 'http://localhost:5173'


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    settings = get_settings()
    if settings.use_stub_scorer:
        app.state.scorer = StubScorer()
    else:
        from diction.scoring.scorer_gop import GopScorer

        app.state.scorer = GopScorer(settings)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title='Diction API', version='0.0.0', lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(health.router, prefix='/api')
    app.include_router(passages.router, prefix='/api')

    @app.exception_handler(ClipTooWeakError)
    async def _handle_clip_too_weak(
        request: Request, exc: ClipTooWeakError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={'error': 'clip_too_weak', 'detail': str(exc)},
        )

    return app
