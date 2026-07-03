from pydantic import BaseModel, ConfigDict


class FlaggedWordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    word: str
    start: float
    end: float
    phoneme: str
    explanation: str
