import asyncio
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from diction.api.voices import validate_voice
from diction.tts.base import Synthesizer

router = APIRouter(tags=['reference'])

MAX_REFERENCE_TEXT_LENGTH = 1000
SYNTHESIS_TIMEOUT_SECONDS = 30.0


def get_synth(request: Request) -> Synthesizer:
    return cast(Synthesizer, request.app.state.synth)


@router.get('/reference')
async def read_reference(
    synth: Annotated[Synthesizer, Depends(get_synth)],
    text: Annotated[str, Query(min_length=1, max_length=MAX_REFERENCE_TEXT_LENGTH)],
    voice: Annotated[str | None, Query()] = None,
) -> Response:
    cleaned = text.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail='Enter text to synthesize')

    validate_voice(voice)

    try:
        audio = await asyncio.wait_for(
            run_in_threadpool(synth.synthesize, cleaned, voice),
            timeout=SYNTHESIS_TIMEOUT_SECONDS,
        )
    except TimeoutError as error:
        raise HTTPException(
            status_code=504, detail='Reference synthesis timed out'
        ) from error

    return Response(
        content=audio,
        media_type='audio/wav',
        headers={'Cache-Control': 'public, max-age=86400'},
    )
