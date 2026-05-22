from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..models.all_models import TrafficData, PollutionData, TransportReading, EnergyData, Alert, Zone

router = APIRouter()


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    since_24h = now - timedelta(hours=24)
    since_48h = now - timedelta(hours=48)

    def avg_or(q, default=0):
        v = q.scalar()
        return round(float(v), 2) if v else default

    # Current 24h window
    avg_cong = avg_or(db.query(func.avg(TrafficData.congestion_level))
                      .filter(TrafficData.timestamp >= since_24h))
    avg_aqi = avg_or(db.query(func.avg(PollutionData.aqi))
                     .filter(PollutionData.timestamp >= since_24h))
    total_energy = avg_or(db.query(func.sum(EnergyData.consumption_kwh))
                          .filter(EnergyData.timestamp >= since_24h))
    tr = db.query(TransportReading).filter(TransportReading.timestamp >= since_24h).all()
    on_time_pct = round(sum(1 for r in tr if r.on_time) / len(tr) * 100, 1) if tr else 0

    # Previous 24h window for trends
    prev_cong = avg_or(db.query(func.avg(TrafficData.congestion_level))
                       .filter(TrafficData.timestamp >= since_48h, TrafficData.timestamp < since_24h))
    prev_aqi = avg_or(db.query(func.avg(PollutionData.aqi))
                      .filter(PollutionData.timestamp >= since_48h, PollutionData.timestamp < since_24h))
    prev_energy = avg_or(db.query(func.sum(EnergyData.consumption_kwh))
                         .filter(EnergyData.timestamp >= since_48h, EnergyData.timestamp < since_24h))

    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    zones_count = db.query(Zone).count()

    def trend(curr, prev):
        if prev == 0:
            return 0
        return round((curr - prev) / prev * 100, 1)

    return {
        "avg_congestion": avg_cong,
        "avg_aqi": avg_aqi,
        "total_energy_kwh": total_energy,
        "transport_on_time_pct": on_time_pct,
        "active_alerts": active_alerts,
        "zones_count": zones_count,
        "trend_congestion": trend(avg_cong, prev_cong),
        "trend_aqi": trend(avg_aqi, prev_aqi),
        "trend_energy": trend(total_energy, prev_energy),
    }


@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    """24h hourly trend data for the main dashboard chart."""
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(hours=23)

    labels = []
    traffic_vals, pollution_vals, energy_vals = [], [], []

    for i in range(24):
        ts = start + timedelta(hours=i)
        te = ts + timedelta(hours=1)
        labels.append(ts.strftime("%H:00"))

        cong = db.query(func.avg(TrafficData.congestion_level)).filter(
            TrafficData.timestamp >= ts, TrafficData.timestamp < te).scalar()
        aqi = db.query(func.avg(PollutionData.aqi)).filter(
            PollutionData.timestamp >= ts, PollutionData.timestamp < te).scalar()
        eng = db.query(func.sum(EnergyData.consumption_kwh)).filter(
            EnergyData.timestamp >= ts, EnergyData.timestamp < te).scalar()

        traffic_vals.append(round(float(cong), 2) if cong else 0)
        pollution_vals.append(round(float(aqi), 1) if aqi else 0)
        energy_vals.append(round(float(eng) / 1000, 1) if eng else 0)  # MWh

    return {"labels": labels, "traffic": traffic_vals, "pollution": pollution_vals, "energy": energy_vals}


@router.get("/zone-summary")
def get_zone_summary(db: Session = Depends(get_db)):
    """Current status for each zone."""
    now = datetime.utcnow()
    since = now - timedelta(hours=3)
    zones = db.query(Zone).all()
    result = []
    for z in zones:
        cong = db.query(func.avg(TrafficData.congestion_level)).filter(
            TrafficData.zone_id == z.id, TrafficData.timestamp >= since).scalar()
        aqi = db.query(func.avg(PollutionData.aqi)).filter(
            PollutionData.zone_id == z.id, PollutionData.timestamp >= since).scalar()
        eng = db.query(func.sum(EnergyData.consumption_kwh)).filter(
            EnergyData.zone_id == z.id, EnergyData.timestamp >= since).scalar()
        result.append({
            "id": z.id, "name": z.name, "zone_type": z.zone_type,
            "latitude": z.latitude, "longitude": z.longitude,
            "congestion": round(float(cong), 2) if cong else 0,
            "aqi": round(float(aqi), 1) if aqi else 0,
            "energy_kwh": round(float(eng), 0) if eng else 0,
        })
    return result
