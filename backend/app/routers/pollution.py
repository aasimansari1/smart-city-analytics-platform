from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models.all_models import PollutionData, Zone

router = APIRouter()

AQI_CATEGORIES = [
    (0, 50, "Good", "green"),
    (51, 100, "Moderate", "yellow"),
    (101, 150, "Unhealthy for Sensitive Groups", "orange"),
    (151, 200, "Unhealthy", "red"),
    (201, 300, "Very Unhealthy", "purple"),
    (301, 500, "Hazardous", "maroon"),
]


def aqi_category(aqi: float):
    for lo, hi, label, color in AQI_CATEGORIES:
        if lo <= aqi <= hi:
            return label, color
    return "Hazardous", "maroon"


@router.get("/")
def get_pollution(
    zone_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = db.query(PollutionData).filter(PollutionData.timestamp >= since)
    if zone_id:
        q = q.filter(PollutionData.zone_id == zone_id)
    rows = q.order_by(PollutionData.timestamp.desc()).limit(500).all()
    result = []
    for r in rows:
        cat, color = aqi_category(r.aqi)
        result.append({
            "id": r.id, "zone_id": r.zone_id, "zone_name": r.zone.name if r.zone else "",
            "timestamp": r.timestamp.isoformat(), "aqi": r.aqi, "co2_ppm": r.co2_ppm,
            "pm25_ugm3": r.pm25_ugm3, "pm10_ugm3": r.pm10_ugm3, "temperature_c": r.temperature_c,
            "humidity_pct": r.humidity_pct, "no2_ppb": r.no2_ppb,
            "aqi_category": cat, "aqi_color": color,
        })
    return result


@router.get("/map")
def get_pollution_map(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=3)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        row = db.query(
            func.avg(PollutionData.aqi),
            func.avg(PollutionData.pm25_ugm3),
            func.avg(PollutionData.temperature_c),
        ).filter(PollutionData.zone_id == z.id, PollutionData.timestamp >= since).one()
        aqi = round(float(row[0]), 1) if row[0] else 0
        cat, color = aqi_category(aqi)
        result.append({
            "zone_id": z.id, "zone_name": z.name, "latitude": z.latitude, "longitude": z.longitude,
            "aqi": aqi, "pm25": round(float(row[1]), 2) if row[1] else 0,
            "temperature": round(float(row[2]), 1) if row[2] else 0,
            "category": cat, "color": color,
        })
    return result


@router.get("/trends")
def get_pollution_trends(
    zone_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=days)
    step = timedelta(hours=3) if days <= 7 else timedelta(hours=6)
    labels, aqi_vals, pm25_vals, co2_vals, temp_vals = [], [], [], [], []

    ts = start
    while ts <= now:
        te = ts + step
        q = db.query(
            func.avg(PollutionData.aqi), func.avg(PollutionData.pm25_ugm3),
            func.avg(PollutionData.co2_ppm), func.avg(PollutionData.temperature_c)
        ).filter(PollutionData.timestamp >= ts, PollutionData.timestamp < te)
        if zone_id:
            q = q.filter(PollutionData.zone_id == zone_id)
        row = q.one()
        labels.append(ts.strftime("%m/%d %H:00"))
        aqi_vals.append(round(float(row[0]), 1) if row[0] else 0)
        pm25_vals.append(round(float(row[1]), 2) if row[1] else 0)
        co2_vals.append(round(float(row[2]), 1) if row[2] else 0)
        temp_vals.append(round(float(row[3]), 1) if row[3] else 0)
        ts = te

    return {"labels": labels, "aqi": aqi_vals, "pm25": pm25_vals, "co2": co2_vals, "temperature": temp_vals}


@router.get("/zones-comparison")
def get_zones_comparison(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        row = db.query(
            func.avg(PollutionData.aqi), func.max(PollutionData.aqi),
            func.avg(PollutionData.pm25_ugm3),
        ).filter(PollutionData.zone_id == z.id, PollutionData.timestamp >= since).one()
        avg_aqi = round(float(row[0]), 1) if row[0] else 0
        cat, color = aqi_category(avg_aqi)
        result.append({
            "zone": z.name, "zone_type": z.zone_type, "avg_aqi": avg_aqi,
            "max_aqi": round(float(row[1]), 1) if row[1] else 0,
            "avg_pm25": round(float(row[2]), 2) if row[2] else 0,
            "category": cat, "color": color,
        })
    return sorted(result, key=lambda x: x["avg_aqi"], reverse=True)


@router.get("/live")
def get_live_pollution(db: Session = Depends(get_db)):
    import numpy as np
    since = datetime.utcnow() - timedelta(hours=1)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        latest = db.query(PollutionData).filter(
            PollutionData.zone_id == z.id, PollutionData.timestamp >= since
        ).order_by(PollutionData.timestamp.desc()).first()
        if latest:
            noise = np.random.normal(1.0, 0.04)
            aqi = round(max(0, latest.aqi * noise), 1)
            cat, color = aqi_category(aqi)
            result.append({
                "zone_id": z.id, "zone_name": z.name, "aqi": aqi,
                "pm25": round(max(0, latest.pm25_ugm3 * noise), 2),
                "co2": round(max(350, latest.co2_ppm * noise), 1),
                "temperature": round(latest.temperature_c + np.random.normal(0, 0.2), 1),
                "category": cat, "color": color,
            })
    return result
