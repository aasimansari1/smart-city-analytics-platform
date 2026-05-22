from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine
from .models.all_models import Base
from .routers import auth, dashboard, traffic, pollution, transport, energy, predictions, alerts, admin, chatbot
from .utils.data_generator import generate_all_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    generate_all_data()
    yield


app = FastAPI(
    title="Smart City Analytics Platform",
    description="AI-powered smart city management system — traffic, pollution, transport & energy analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(traffic.router,     prefix="/api/traffic",     tags=["Traffic"])
app.include_router(pollution.router,   prefix="/api/pollution",   tags=["Pollution"])
app.include_router(transport.router,   prefix="/api/transport",   tags=["Transport"])
app.include_router(energy.router,      prefix="/api/energy",      tags=["Energy"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(alerts.router,      prefix="/api/alerts",      tags=["Alerts"])
app.include_router(admin.router,       prefix="/api/admin",       tags=["Admin"])
app.include_router(chatbot.router,     prefix="/api/chatbot",     tags=["Chatbot"])


@app.get("/")
def root():
    return {"message": "Smart City Analytics Platform API v1.0.0", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
