from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from diction.config import Settings, get_settings
from diction.tts.voices import VOICES, is_known_voice

router = APIRouter(tags=['voices'])


class VoiceResponse(BaseModel):
    id: str
    label: str
    accent: str
    gender: str


class VoicesResponse(BaseModel):
    voices: list[VoiceResponse]
    default: str


@router.get('/voices')
def list_voices(
    settings: Annotated[Settings, Depends(get_settings)],
) -> VoicesResponse:
    return VoicesResponse(
        voices=[
            VoiceResponse(
                id=voice.id,
                label=voice.label,
                accent=voice.accent,
                gender=voice.gender,
            )
            for voice in VOICES
        ],
        default=settings.tts_voice,
    )


def validate_voice(voice: str | None) -> str | None:
    if voice is not None and not is_known_voice(voice):
        raise HTTPException(status_code=422, detail='Unknown voice')
    return voice
