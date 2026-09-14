from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, books, groups, reviews, stats
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="BookWheel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(books.router)
app.include_router(reviews.router)
app.include_router(stats.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
