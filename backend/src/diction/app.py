from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from diction.api import (
    drills,
    health,
    minimal_pairs,
    passages,
    reference,
    sessions,
    weak_sounds,
)
from diction.config import get_settings
from diction.db.engine import create_db_and_tables
from diction.feedback.base import StubExplainer
from diction.scoring.audio import ClipTooWeakError
from diction.scoring.base import StubScorer
from diction.tts.base import StubSynthesizer
from diction.tts.cache import CachedSynthesizer, ReferenceAudioCache

LOCALHOST_ORIGIN_REGEX = r'http://localhost:\d+'


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    settings = get_settings()
    if settings.use_stub_scorer:
        app.state.scorer = StubScorer()
    else:
        try:
            from diction.scoring.scorer_gop import GopScorer
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The scoring model stack is not installed. Run '
                "'uv sync --extra scoring', or set DICTION_USE_STUB_SCORER=true "
                'to run against the stub scorer.'
            ) from error

        app.state.scorer = GopScorer(settings)

    if settings.use_stub_explainer:
        app.state.explainer = StubExplainer()
    else:
        from diction.feedback.explainer_llm import OllamaExplainer

        try:
            app.state.explainer = OllamaExplainer.from_settings(settings)
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The feedback model stack is not installed. Run '
                "'uv sync --extra feedback', or set DICTION_USE_STUB_EXPLAINER=true "
                'to run against the stub explainer.'
            ) from error

    if settings.use_stub_synth:
        app.state.synth = StubSynthesizer()
    else:
        try:
            from diction.tts.synth_piper import PiperSynthesizer
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The TTS stack is not installed. Run '
                "'uv sync --extra tts', or set DICTION_USE_STUB_SYNTH=true "
                'to run against the stub synthesizer.'
            ) from error

        app.state.synth = CachedSynthesizer(
            PiperSynthesizer(settings),
            ReferenceAudioCache(settings.reference_cache_dir),
            str(settings.tts_voice),
        )
    yield


def create_app() -> FastAPI:
    app = FastAPI(title='Diction API', version='0.0.0', lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=LOCALHOST_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(drills.router, prefix='/api')
    app.include_router(health.router, prefix='/api')
    app.include_router(minimal_pairs.router, prefix='/api')
    app.include_router(passages.router, prefix='/api')
    app.include_router(reference.router, prefix='/api')
    app.include_router(sessions.router, prefix='/api')
    app.include_router(weak_sounds.router, prefix='/api')

    @app.exception_handler(ClipTooWeakError)
    async def _handle_clip_too_weak(
        request: Request, exc: ClipTooWeakError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={'error': 'clip_too_weak', 'detail': str(exc)},
        )

    return app
