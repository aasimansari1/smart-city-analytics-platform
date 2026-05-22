from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models.all_models import EnergyData, Zone

router = APIRouter()


@router.get("/")
def get_energy(
    zone_id: Optional[int] = None,
    sector: Optional[str] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = db.query(EnergyData).filter(EnergyData.timestamp >= since)
    if zone_id:
        q = q.filter(EnergyData.zone_id == zone_id)
    if sector:
        q = q.filter(EnergyData.sector == sector)
    rows = q.order_by(EnergyData.timestamp.desc()).limit(500).all()
    return [{"id": r.id, "zone_id": r.zone_id, "zone_name": r.zone.name if r.zone else "",
             "timestamp": r.timestamp.isoformat(), "sector": r.sector,
             "consumption_kwh": r.consumption_kwh, "peak_demand_kw": r.peak_demand_kw,
             "is_anomaly": r.is_anomaly, "cost_usd": r.cost_usd} for r in rows]


@router.get("/trends")
def get_energy_trends(
    zone_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=days)
    step = timedelta(hours=3) if days <= 7 else timedelta(hours=6)
    labels, total_vals, residential_vals, commercial_vals, industrial_vals = [], [], [], [], []

    ts = start
    while ts <= now:
        te = ts + step
        base_q = db.query(func.sum(EnergyData.consumption_kwh)).filter(
            EnergyData.timestamp >= ts, EnergyData.timestamp < te)
        if zone_id:
            base_q = base_q.filter(EnergyData.zone_id == zone_id)

        def sector_sum(s):
            v = base_q.filter(EnergyData.sector == s).scalar()
            return round(float(v) / 1000, 2) if v else 0

        total = base_q.scalar()
        labels.append(ts.strftime("%m/%d %H:00"))
        total_vals.append(round(float(total) / 1000, 2) if total else 0)
        residential_vals.append(sector_sum("residential"))
        commercial_vals.append(sector_sum("commercial"))
        industrial_vals.append(sector_sum("industrial"))
        ts = te

    return {"labels": labels, "total": total_vals, "residential": residential_vals,
            "commercial": commercial_vals, "industrial": industrial_vals}


@router.get("/by-sector")
def get_by_sector(zone_id: Optional[int] = None, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    q = db.query(EnergyData.sector, func.sum(EnergyData.consumption_kwh).label("total"),
                 func.avg(EnergyData.cost_usd).label("avg_cost")
                 ).filter(EnergyData.timestamp >= since)
    if zone_id:
        q = q.filter(EnergyData.zone_id == zone_id)
    rows = q.group_by(EnergyData.sector).all()
    return [{"sector": r.sector, "total_kwh": round(float(r.total), 0),
             "total_mwh": round(float(r.total) / 1000, 2),
             "avg_cost_usd": round(float(r.avg_cost), 2)} for r in rows]


@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=7)
    rows = db.query(EnergyData).filter(EnergyData.is_anomaly == True,
                                        EnergyData.timestamp >= since).order_by(
        EnergyData.timestamp.desc()).all()
    return [{"id": r.id, "zone_name": r.zone.name if r.zone else "", "sector": r.sector,
             "timestamp": r.timestamp.isoformat(), "consumption_kwh": r.consumption_kwh,
             "cost_usd": r.cost_usd} for r in rows]


@router.get("/zones-comparison")
def get_zones_comparison(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        row = db.query(
            func.sum(EnergyData.consumption_kwh),
            func.avg(EnergyData.peak_demand_kw),
            func.sum(EnergyData.cost_usd),
        ).filter(EnergyData.zone_id == z.id, EnergyData.timestamp >= since).one()
        result.append({
            "zone": z.name, "zone_type": z.zone_type,
            "total_kwh": round(float(row[0]), 0) if row[0] else 0,
            "avg_peak_kw": round(float(row[1]), 1) if row[1] else 0,
            "total_cost_usd": round(float(row[2]), 2) if row[2] else 0,
        })
    return sorted(result, key=lambda x: x["total_kwh"], reverse=True)


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    zones = db.query(Zone).all()
    recs = []
    for z in zones:
        total = db.query(func.sum(EnergyData.consumption_kwh)).filter(
            EnergyData.zone_id == z.id, EnergyData.timestamp >= since).scalar()
        if not total:
            continue
        total = float(total)
        if total > 50000:
            recs.append({"zone": z.name, "priority": "high",
                         "recommendation": f"Implement smart load balancing in {z.name}. Current 24h consumption {total:,.0f} kWh exceeds threshold.",
                         "potential_saving_pct": 15})
        elif total > 20000:
            recs.append({"zone": z.name, "priority": "medium",
                         "recommendation": f"Consider off-peak scheduling for non-critical operations in {z.name}.",
                         "potential_saving_pct": 8})
    recs.append({"zone": "City-wide", "priority": "low",
                 "recommendation": "Install LED lighting across all public spaces to reduce baseline consumption by ~12%.",
                 "potential_saving_pct": 12})
    return recs
