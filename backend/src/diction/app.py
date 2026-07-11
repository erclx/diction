import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from diction.api import (
    content,
    drills,
    free_topic,
    health,
    interview,
    minimal_pairs,
    passages,
    prosody,
    reference,
    resurfacing,
    sessions,
    voices,
    weak_sounds,
)
from diction.config import get_settings
from diction.db.engine import create_db_and_tables
from diction.feedback.base import StubContentGenerator, StubCritic, StubExplainer
from diction.interview.base import StubInterviewScorer
from diction.scoring.audio import ClipTooWeakError
from diction.scoring.base import StubScorer
from diction.scoring.prosody_base import StubProsodyScorer
from diction.scoring.transcription_base import StubTranscriber, Transcriber
from diction.tts.base import StubSynthesizer
from diction.tts.cache import CachedSynthesizer, ReferenceAudioCache

LOCALHOST_ORIGIN_REGEX = r'http://localhost:\d+'
WARMUP_TEXT = 'Warm up.'

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    settings = get_settings()

    transcriber: Transcriber
    if settings.use_stub_scorer and settings.use_stub_prosody:
        transcriber = StubTranscriber()
    else:
        try:
            from diction.scoring.transcription import WhisperTranscriber
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The scoring model stack is not installed. Run '
                "'uv sync --extra scoring', or set DICTION_USE_STUB_SCORER=true "
                'and DICTION_USE_STUB_PROSODY=true to run against the stubs.'
            ) from error

        transcriber = WhisperTranscriber(settings)
    app.state.transcriber = transcriber

    if settings.use_stub_scorer:
        app.state.scorer = StubScorer()
    else:
        from diction.scoring.scorer_gop import GopScorer

        app.state.scorer = GopScorer(settings, transcriber)

    if settings.use_stub_prosody:
        app.state.prosody_scorer = StubProsodyScorer()
    else:
        from diction.scoring.prosody_real import ProsodyScorer

        app.state.prosody_scorer = ProsodyScorer(settings, transcriber)

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

    if settings.use_stub_critic:
        app.state.critic = StubCritic()
    else:
        from diction.feedback.critique_llm import OllamaCritic

        try:
            app.state.critic = OllamaCritic.from_settings(settings)
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The feedback model stack is not installed. Run '
                "'uv sync --extra feedback', or set DICTION_USE_STUB_CRITIC=true "
                'to run against the stub critic.'
            ) from error

    if settings.use_stub_generator:
        app.state.generator = StubContentGenerator()
    else:
        from diction.feedback.generator_llm import OllamaContentGenerator

        try:
            app.state.generator = OllamaContentGenerator.from_settings(settings)
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The feedback model stack is not installed. Run '
                "'uv sync --extra feedback', or set DICTION_USE_STUB_GENERATOR=true "
                'to run against the stub generator.'
            ) from error

    if settings.use_stub_interview:
        app.state.interview_scorer = StubInterviewScorer()
    else:
        try:
            from diction.interview.scorer_cv import CvInterviewScorer
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The interview CV stack is not installed. Run '
                "'uv sync --extra interview', or set DICTION_USE_STUB_INTERVIEW=true "
                'to run against the stub interview scorer.'
            ) from error

        app.state.interview_scorer = CvInterviewScorer(settings)

    if settings.use_stub_synth:
        app.state.synth = StubSynthesizer()
    else:
        try:
            from diction.tts.synth_kokoro import KokoroSynthesizer
        except ModuleNotFoundError as error:
            raise RuntimeError(
                'The TTS stack is not installed. Run '
                "'uv sync --extra tts', or set DICTION_USE_STUB_SYNTH=true "
                'to run against the stub synthesizer.'
            ) from error

        kokoro = KokoroSynthesizer(settings)
        app.state.synth = CachedSynthesizer(
            kokoro,
            ReferenceAudioCache(settings.reference_cache_dir),
            settings.tts_voice,
        )

        logger.info('warming reference synthesizer')
        try:
            await asyncio.to_thread(kokoro.synthesize, WARMUP_TEXT)
        except Exception:
            logger.warning(
                'reference synthesizer warm-up failed, '
                'falling back to lazy first-click synthesis',
                exc_info=True,
            )
        else:
            logger.info('reference synthesizer warm')

    logger.info(
        'model stack resolved: scorer=%s transcriber=%s prosody=%s '
        'explainer=%s critic=%s generator=%s synth=%s interview=%s',
        type(app.state.scorer).__name__,
        type(app.state.transcriber).__name__,
        type(app.state.prosody_scorer).__name__,
        type(app.state.explainer).__name__,
        type(app.state.critic).__name__,
        type(app.state.generator).__name__,
        type(app.state.synth).__name__,
        type(app.state.interview_scorer).__name__,
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

    app.include_router(content.router, prefix='/api')
    app.include_router(drills.router, prefix='/api')
    app.include_router(free_topic.router, prefix='/api')
    app.include_router(health.router, prefix='/api')
    app.include_router(interview.router, prefix='/api')
    app.include_router(minimal_pairs.router, prefix='/api')
    app.include_router(passages.router, prefix='/api')
    app.include_router(prosody.router, prefix='/api')
    app.include_router(reference.router, prefix='/api')
    app.include_router(resurfacing.router, prefix='/api')
    app.include_router(sessions.router, prefix='/api')
    app.include_router(voices.router, prefix='/api')
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
