from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from pydantic import BaseModel
from ..database import get_db
from ..models.all_models import TrafficData, PollutionData, EnergyData, TransportReading, Alert

router = APIRouter()


class ChatMessage(BaseModel):
    message: str


def get_city_context(db: Session) -> dict:
    since = datetime.utcnow() - timedelta(hours=24)
    cong = db.query(func.avg(TrafficData.congestion_level)).filter(TrafficData.timestamp >= since).scalar()
    aqi = db.query(func.avg(PollutionData.aqi)).filter(PollutionData.timestamp >= since).scalar()
    energy = db.query(func.sum(EnergyData.consumption_kwh)).filter(EnergyData.timestamp >= since).scalar()
    tr = db.query(TransportReading).filter(TransportReading.timestamp >= since).all()
    on_time = round(sum(1 for r in tr if r.on_time) / len(tr) * 100, 1) if tr else 0
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    return {
        "congestion": round(float(cong), 2) if cong else 0,
        "aqi": round(float(aqi), 1) if aqi else 0,
        "energy_mwh": round(float(energy) / 1000, 1) if energy else 0,
        "on_time_pct": on_time,
        "active_alerts": active_alerts,
    }


RESPONSES = {
    "traffic": lambda ctx: f"Current average city-wide congestion is {ctx['congestion']}/10. "
        + ("Traffic conditions are critical — recommend activating alternate routing protocols." if ctx['congestion'] > 7
           else "Traffic is moderate — monitoring closely." if ctx['congestion'] > 5
           else "Traffic is flowing well across the city."),

    "pollution": lambda ctx: f"Current average AQI is {ctx['aqi']}. "
        + ("ALERT: Air quality is hazardous. Immediate action required." if ctx['aqi'] > 200
           else "Air quality is unhealthy for sensitive groups. Advisories issued." if ctx['aqi'] > 100
           else "Air quality is good across most zones."),

    "energy": lambda ctx: f"The city consumed {ctx['energy_mwh']} MWh in the last 24 hours. "
        + ("High consumption detected — load balancing recommended." if ctx['energy_mwh'] > 500
           else "Energy consumption is within normal operating parameters."),

    "transport": lambda ctx: f"Public transport is running at {ctx['on_time_pct']}% on-time performance. "
        + ("Significant delays across routes. Deploying additional vehicles." if ctx['on_time_pct'] < 70
           else "Transport network is performing well."),

    "alert": lambda ctx: f"There are currently {ctx['active_alerts']} active unresolved alerts. "
        + ("Immediate attention required for critical alerts." if ctx['active_alerts'] > 5
           else "Alert levels are manageable."),

    "status": lambda ctx: (
        f"City Status Summary:\n"
        f"• Traffic Congestion: {ctx['congestion']}/10\n"
        f"• Air Quality Index: {ctx['aqi']} AQI\n"
        f"• Energy (24h): {ctx['energy_mwh']} MWh\n"
        f"• Transport On-Time: {ctx['on_time_pct']}%\n"
        f"• Active Alerts: {ctx['active_alerts']}"
    ),
}

KEYWORD_MAP = {
    "traffic": ["traffic", "congestion", "vehicles", "cars", "road", "speed"],
    "pollution": ["pollution", "air", "aqi", "pm2", "co2", "quality", "smog"],
    "energy": ["energy", "electricity", "power", "consumption", "kwh", "mwh"],
    "transport": ["transport", "bus", "train", "metro", "delay", "route", "passenger"],
    "alert": ["alert", "emergency", "warning", "critical", "issue", "problem"],
    "status": ["status", "summary", "overview", "how", "report", "city"],
}


@router.post("/")
def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    text = msg.message.lower()
    ctx = get_city_context(db)

    for topic, keywords in KEYWORD_MAP.items():
        if any(kw in text for kw in keywords):
            response = RESPONSES[topic](ctx)
            return {"response": response, "topic": topic, "context": ctx}

    # Default response
    suggestions = ["traffic status", "air quality", "energy consumption", "transport delays", "active alerts"]
    return {
        "response": (
            f"I'm your Smart City AI assistant. I can help you with city analytics.\n\n"
            f"Try asking about: {', '.join(suggestions)}.\n\n"
            f"Quick status: Congestion {ctx['congestion']}/10 | AQI {ctx['aqi']} | {ctx['active_alerts']} alerts active."
        ),
        "topic": "general",
        "context": ctx,
    }
