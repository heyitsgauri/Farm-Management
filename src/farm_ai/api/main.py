import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..config.settings import CORS_ORIGINS, DEFAULT_PPO_MODEL_PATH
from .routes import health_router, farm_router, ppo_router
from .services.ppo_service import ppo_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("farm_ai.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler: runs on startup and shutdown."""
    logger.info("Initializing Autonomous Farm AI Backend...")
    # Pre-load PPO model once during startup
    loaded = ppo_service.load_model(DEFAULT_PPO_MODEL_PATH)
    if loaded:
        logger.info(f"PPO model loaded successfully from '{DEFAULT_PPO_MODEL_PATH}'")
    else:
        logger.warning(f"Could not load PPO model at startup: {ppo_service.load_error}")

    yield

    logger.info("Shutting down Autonomous Farm AI Backend...")


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI application."""
    app = FastAPI(
        title="Autonomous Farm AI API",
        description=(
            "Scenario-Aware Economic Decision Framework for Autonomous Farm Management. "
            "Provides HTTP/JSON endpoints for simulation interaction, human player actions, "
            "and PPO reinforcement learning agent inference."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Configure CORS for React frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global unhandled exception handler to avoid exposing raw stack traces
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error occurred."},
        )

    # Register routers with /api prefix
    app.include_router(health_router, prefix="/api")
    app.include_router(farm_router, prefix="/api")
    app.include_router(ppo_router, prefix="/api")

    return app


app = create_app()
