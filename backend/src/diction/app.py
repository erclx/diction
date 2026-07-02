from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from diction.api import health

FRONTEND_ORIGIN = 'http://localhost:5173'


def create_app() -> FastAPI:
    app = FastAPI(title='Diction API', version='0.0.0')

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(health.router, prefix='/api')

    return app
