from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=['health'])


class HealthResponse(BaseModel):
    status: str
    service: str


@router.get('/health')
async def read_health() -> HealthResponse:
    return HealthResponse(status='ok', service='diction-backend')
