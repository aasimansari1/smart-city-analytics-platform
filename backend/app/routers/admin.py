from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from ..database import get_db
from ..models.all_models import Zone, TrafficData, PollutionData, EnergyData, TransportReading, Alert, User

router = APIRouter()


@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    return {
        "zones": db.query(Zone).count(),
        "users": db.query(User).count(),
        "traffic_records": db.query(TrafficData).count(),
        "pollution_records": db.query(PollutionData).count(),
        "energy_records": db.query(EnergyData).count(),
        "transport_records": db.query(TransportReading).count(),
        "total_alerts": db.query(Alert).count(),
        "unresolved_alerts": db.query(Alert).filter(Alert.is_resolved == False).count(),
    }


@router.get("/zones")
def get_zones(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    return [{"id": z.id, "name": z.name, "zone_type": z.zone_type, "latitude": z.latitude,
             "longitude": z.longitude, "area_sqkm": z.area_sqkm, "population": z.population}
            for z in zones]


@router.post("/zones")
def create_zone(data: dict, db: Session = Depends(get_db)):
    zone = Zone(**data)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return {"id": zone.id, "name": zone.name}


@router.put("/zones/{zone_id}")
def update_zone(zone_id: int, data: dict, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for k, v in data.items():
        setattr(zone, k, v)
    db.commit()
    return {"success": True}


@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role,
             "is_active": u.is_active, "created_at": u.created_at.isoformat()} for u in users]


@router.get("/report")
def generate_report(db: Session = Depends(get_db)):
    """Generate a comprehensive city analytics report."""
    now = datetime.utcnow()
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    # Traffic summary
    traffic_avg = db.query(func.avg(TrafficData.congestion_level)).filter(
        TrafficData.timestamp >= since_24h).scalar()
    traffic_incidents = db.query(func.sum(TrafficData.incident_count)).filter(
        TrafficData.timestamp >= since_24h).scalar()

    # Pollution summary
    aqi_avg = db.query(func.avg(PollutionData.aqi)).filter(
        PollutionData.timestamp >= since_24h).scalar()
    aqi_max = db.query(func.max(PollutionData.aqi)).filter(
        PollutionData.timestamp >= since_24h).scalar()

    # Energy summary
    energy_total = db.query(func.sum(EnergyData.consumption_kwh)).filter(
        EnergyData.timestamp >= since_24h).scalar()
    energy_cost = db.query(func.sum(EnergyData.cost_usd)).filter(
        EnergyData.timestamp >= since_24h).scalar()
    anomalies = db.query(EnergyData).filter(EnergyData.is_anomaly == True,
                                              EnergyData.timestamp >= since_7d).count()

    # Transport
    tr = db.query(TransportReading).filter(TransportReading.timestamp >= since_24h).all()
    on_time_pct = round(sum(1 for r in tr if r.on_time) / len(tr) * 100, 1) if tr else 0
    avg_delay = round(sum(r.delay_minutes for r in tr) / len(tr), 1) if tr else 0

    return {
        "generated_at": now.isoformat(),
        "period": "Last 24 hours",
        "traffic": {
            "avg_congestion": round(float(traffic_avg), 2) if traffic_avg else 0,
            "total_incidents": int(traffic_incidents) if traffic_incidents else 0,
            "status": "High" if traffic_avg and traffic_avg > 6 else "Normal",
        },
        "pollution": {
            "avg_aqi": round(float(aqi_avg), 1) if aqi_avg else 0,
            "max_aqi": round(float(aqi_max), 1) if aqi_max else 0,
            "status": "Unhealthy" if aqi_avg and aqi_avg > 150 else "Moderate" if aqi_avg and aqi_avg > 100 else "Good",
        },
        "energy": {
            "total_kwh": round(float(energy_total), 0) if energy_total else 0,
            "total_mwh": round(float(energy_total) / 1000, 2) if energy_total else 0,
            "total_cost_usd": round(float(energy_cost), 2) if energy_cost else 0,
            "anomalies_7d": anomalies,
        },
        "transport": {
            "on_time_pct": on_time_pct,
            "avg_delay_min": avg_delay,
            "status": "Good" if on_time_pct > 80 else "Delayed",
        },
        "alerts": {
            "total": db.query(Alert).count(),
            "critical": db.query(Alert).filter(Alert.severity == "critical", Alert.is_resolved == False).count(),
            "unresolved": db.query(Alert).filter(Alert.is_resolved == False).count(),
        }
    }
