# Entry point kept for backwards compatibility.
# The actual FastAPI application lives at app/main.py
# Run with: uvicorn app.main:app --reload
from app.main import app  # noqa: F401
