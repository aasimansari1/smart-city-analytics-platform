from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models.all_models import TransportRoute, TransportReading

router = APIRouter()


@router.get("/routes")
def get_routes(db: Session = Depends(get_db)):
    routes = db.query(TransportRoute).all()
    since = datetime.utcnow() - timedelta(hours=24)
    result = []
    for r in routes:
        row = db.query(
            func.avg(TransportReading.delay_minutes),
            func.avg(TransportReading.occupancy_pct),
            func.avg(TransportReading.passenger_count),
        ).filter(TransportReading.route_id == r.id, TransportReading.timestamp >= since).one()
        on_time_rows = db.query(TransportReading).filter(
            TransportReading.route_id == r.id, TransportReading.timestamp >= since).all()
        on_time_pct = round(sum(1 for x in on_time_rows if x.on_time) / len(on_time_rows) * 100, 1) if on_time_rows else 0
        result.append({
            "id": r.id, "route_name": r.route_name, "route_type": r.route_type,
            "from_zone": r.from_zone, "to_zone": r.to_zone, "distance_km": r.distance_km,
            "scheduled_duration_min": r.scheduled_duration_min,
            "avg_delay_min": round(float(row[0]), 1) if row[0] else 0,
            "avg_occupancy_pct": round(float(row[1]), 1) if row[1] else 0,
            "avg_passengers": int(row[2]) if row[2] else 0,
            "on_time_pct": on_time_pct,
        })
    return result


@router.get("/trends")
def get_transport_trends(
    route_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=days)
    step = timedelta(hours=3) if days <= 7 else timedelta(hours=6)
    labels, delay_vals, occupancy_vals, passenger_vals = [], [], [], []

    ts = start
    while ts <= now:
        te = ts + step
        q = db.query(
            func.avg(TransportReading.delay_minutes),
            func.avg(TransportReading.occupancy_pct),
            func.avg(TransportReading.passenger_count),
        ).filter(TransportReading.timestamp >= ts, TransportReading.timestamp < te)
        if route_id:
            q = q.filter(TransportReading.route_id == route_id)
        row = q.one()
        labels.append(ts.strftime("%m/%d %H:00"))
        delay_vals.append(round(float(row[0]), 1) if row[0] else 0)
        occupancy_vals.append(round(float(row[1]), 1) if row[1] else 0)
        passenger_vals.append(int(row[2]) if row[2] else 0)
        ts = te

    return {"labels": labels, "delay": delay_vals, "occupancy": occupancy_vals, "passengers": passenger_vals}


@router.get("/peak-hours")
def get_peak_hours(route_id: Optional[int] = None, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=14)
    q = db.query(
        func.strftime("%H", TransportReading.timestamp).label("hour"),
        func.avg(TransportReading.passenger_count).label("avg_passengers"),
        func.avg(TransportReading.occupancy_pct).label("avg_occ"),
        func.avg(TransportReading.delay_minutes).label("avg_delay"),
    ).filter(TransportReading.timestamp >= since)
    if route_id:
        q = q.filter(TransportReading.route_id == route_id)
    rows = q.group_by("hour").order_by("hour").all()
    return [{"hour": int(r.hour), "label": f"{int(r.hour):02d}:00",
             "avg_passengers": int(r.avg_passengers), "avg_occupancy": round(float(r.avg_occ), 1),
             "avg_delay": round(float(r.avg_delay), 1)} for r in rows]


@router.get("/performance")
def get_route_performance(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=7)
    routes = db.query(TransportRoute).all()
    result = []
    for r in routes:
        readings = db.query(TransportReading).filter(
            TransportReading.route_id == r.id, TransportReading.timestamp >= since).all()
        if not readings:
            continue
        on_time_pct = round(sum(1 for x in readings if x.on_time) / len(readings) * 100, 1)
        avg_delay = round(sum(x.delay_minutes for x in readings) / len(readings), 1)
        avg_occ = round(sum(x.occupancy_pct for x in readings) / len(readings), 1)
        efficiency = round((on_time_pct * 0.5 + (100 - min(100, avg_delay * 5)) * 0.3 + min(100, avg_occ) * 0.2), 1)
        result.append({
            "route_name": r.route_name, "route_type": r.route_type,
            "on_time_pct": on_time_pct, "avg_delay_min": avg_delay,
            "avg_occupancy_pct": avg_occ, "efficiency_score": efficiency,
        })
    return sorted(result, key=lambda x: x["efficiency_score"], reverse=True)
