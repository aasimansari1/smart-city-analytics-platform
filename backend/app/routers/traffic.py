from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models.all_models import TrafficData, Zone

router = APIRouter()


@router.get("/")
def get_traffic(
    zone_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = db.query(TrafficData).filter(TrafficData.timestamp >= since)
    if zone_id:
        q = q.filter(TrafficData.zone_id == zone_id)
    rows = q.order_by(TrafficData.timestamp.desc()).limit(500).all()
    return [{"id": r.id, "zone_id": r.zone_id, "zone_name": r.zone.name if r.zone else "",
             "timestamp": r.timestamp.isoformat(), "vehicle_count": r.vehicle_count,
             "avg_speed_kmh": r.avg_speed_kmh, "congestion_level": r.congestion_level,
             "incident_count": r.incident_count} for r in rows]


@router.get("/heatmap")
def get_heatmap(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=3)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        cong = db.query(func.avg(TrafficData.congestion_level)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        vehicles = db.query(func.avg(TrafficData.vehicle_count)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        result.append({
            "zone_id": z.id, "zone_name": z.name, "latitude": z.latitude, "longitude": z.longitude,
            "congestion": round(float(cong), 2) if cong else 0,
            "vehicle_count": int(vehicles) if vehicles else 0,
        })
    return result


@router.get("/trends")
def get_traffic_trends(
    zone_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=days)
    labels, congestion_vals, vehicle_vals, speed_vals = [], [], [], []

    step = timedelta(hours=3) if days <= 7 else timedelta(hours=6)
    ts = start
    while ts <= now:
        te = ts + step
        q = db.query(
            func.avg(TrafficData.congestion_level),
            func.avg(TrafficData.vehicle_count),
            func.avg(TrafficData.avg_speed_kmh)
        ).filter(TrafficData.timestamp >= ts, TrafficData.timestamp < te)
        if zone_id:
            q = q.filter(TrafficData.zone_id == zone_id)
        row = q.one()
        labels.append(ts.strftime("%m/%d %H:00"))
        congestion_vals.append(round(float(row[0]), 2) if row[0] else 0)
        vehicle_vals.append(int(row[1]) if row[1] else 0)
        speed_vals.append(round(float(row[2]), 1) if row[2] else 0)
        ts = te

    return {"labels": labels, "congestion": congestion_vals, "vehicles": vehicle_vals, "speed": speed_vals}


@router.get("/peak-hours")
def get_peak_hours(zone_id: Optional[int] = None, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=14)
    q = db.query(
        func.strftime("%H", TrafficData.timestamp).label("hour"),
        func.avg(TrafficData.congestion_level).label("avg_cong")
    ).filter(TrafficData.timestamp >= since)
    if zone_id:
        q = q.filter(TrafficData.zone_id == zone_id)
    rows = q.group_by("hour").order_by("hour").all()
    return [{"hour": int(r.hour), "label": f"{int(r.hour):02d}:00",
             "avg_congestion": round(float(r.avg_cong), 2)} for r in rows]


@router.get("/zones-comparison")
def get_zones_comparison(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        cong = db.query(func.avg(TrafficData.congestion_level)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        vehicles = db.query(func.avg(TrafficData.vehicle_count)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        incidents = db.query(func.sum(TrafficData.incident_count)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        result.append({
            "zone": z.name, "zone_type": z.zone_type,
            "avg_congestion": round(float(cong), 2) if cong else 0,
            "avg_vehicles": int(vehicles) if vehicles else 0,
            "total_incidents": int(incidents) if incidents else 0,
        })
    return sorted(result, key=lambda x: x["avg_congestion"], reverse=True)


@router.get("/live")
def get_live_traffic(db: Session = Depends(get_db)):
    import numpy as np, random
    """Simulate a real-time reading with slight random noise."""
    since = datetime.utcnow() - timedelta(hours=1)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        latest = db.query(TrafficData).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since
        ).order_by(TrafficData.timestamp.desc()).first()
        if latest:
            noise = np.random.normal(1.0, 0.05)
            result.append({
                "zone_id": z.id, "zone_name": z.name, "zone_type": z.zone_type,
                "vehicle_count": max(0, int(latest.vehicle_count * noise)),
                "avg_speed_kmh": round(max(5, latest.avg_speed_kmh * np.random.normal(1, 0.03)), 1),
                "congestion_level": round(min(10, max(0, latest.congestion_level * noise)), 2),
                "status": "critical" if latest.congestion_level > 7 else "warning" if latest.congestion_level > 5 else "normal",
            })
    return result
