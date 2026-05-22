import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.all_models import Zone, TrafficData, PollutionData, TransportRoute, TransportReading, EnergyData, Alert, User
from ..utils.auth import hash_password

ZONES = [
    {"name": "Downtown Core",     "zone_type": "downtown",    "lat": 40.7128, "lon": -74.0060, "area": 12.5, "pop": 185000},
    {"name": "North Suburbs",     "zone_type": "residential", "lat": 40.7549, "lon": -73.9840, "area": 28.0, "pop": 220000},
    {"name": "Industrial East",   "zone_type": "industrial",  "lat": 40.6892, "lon": -73.9442, "area": 35.0, "pop": 45000},
    {"name": "West Commercial",   "zone_type": "commercial",  "lat": 40.7282, "lon": -74.0776, "area": 18.0, "pop": 95000},
    {"name": "South Port",        "zone_type": "industrial",  "lat": 40.6501, "lon": -74.0099, "area": 22.0, "pop": 60000},
    {"name": "University District","zone_type":"commercial",   "lat": 40.7295, "lon": -73.9965, "area": 8.0,  "pop": 78000},
    {"name": "Green Valley",      "zone_type": "residential", "lat": 40.7614, "lon": -73.9776, "area": 40.0, "pop": 310000},
    {"name": "Harbor View",       "zone_type": "residential", "lat": 40.6892, "lon": -74.0445, "area": 25.0, "pop": 145000},
    {"name": "Tech Park",         "zone_type": "commercial",  "lat": 40.7431, "lon": -74.0324, "area": 15.0, "pop": 55000},
    {"name": "Old Town",          "zone_type": "downtown",    "lat": 40.7027, "lon": -74.0147, "area": 9.0,  "pop": 120000},
]

ROUTES = [
    {"name": "Route 1 - Central Loop",   "type": "bus",   "from": "Downtown Core",   "to": "North Suburbs",    "dist": 14.2, "dur": 45},
    {"name": "Route 2 - East Express",   "type": "metro", "from": "Downtown Core",   "to": "Industrial East",  "dist": 9.8,  "dur": 22},
    {"name": "Route 3 - West Line",      "type": "metro", "from": "West Commercial", "to": "Downtown Core",    "dist": 7.5,  "dur": 18},
    {"name": "Route 4 - South Harbor",   "type": "bus",   "from": "South Port",      "to": "Downtown Core",    "dist": 11.3, "dur": 38},
    {"name": "Route 5 - University Exp", "type": "tram",  "from": "University District","to":"North Suburbs",   "dist": 6.2,  "dur": 28},
    {"name": "Route 6 - Tech Shuttle",   "type": "bus",   "from": "Tech Park",       "to": "Downtown Core",    "dist": 8.9,  "dur": 32},
    {"name": "Route 7 - Green Valley",   "type": "metro", "from": "Green Valley",    "to": "Downtown Core",    "dist": 16.4, "dur": 35},
    {"name": "Route 8 - Harbor Link",    "type": "bus",   "from": "Harbor View",     "to": "West Commercial",  "dist": 12.1, "dur": 42},
]


def hour_factor(hour: int) -> float:
    """Rush hour multiplier: peaks at 8am and 6pm."""
    if 7 <= hour <= 9:
        return 1.0 + 0.8 * np.exp(-0.5 * ((hour - 8) / 0.7) ** 2)
    if 17 <= hour <= 19:
        return 1.0 + 0.7 * np.exp(-0.5 * ((hour - 18) / 0.7) ** 2)
    if 0 <= hour <= 5:
        return 0.2 + 0.05 * hour
    return 0.5 + 0.1 * np.sin(np.pi * (hour - 10) / 14)


def weekday_factor(dow: int) -> float:
    if dow < 5:
        return 1.0
    return 0.55


def generate_all_data():
    db = SessionLocal()
    try:
        if db.query(Zone).count() > 0:
            return  # already seeded

        _seed_users(db)
        zone_objs = _seed_zones(db)
        route_objs = _seed_routes(db)
        _seed_traffic(db, zone_objs)
        _seed_pollution(db, zone_objs)
        _seed_transport(db, route_objs)
        _seed_energy(db, zone_objs)
        _seed_alerts(db, zone_objs)
        db.commit()
        print("✅ City data seeded successfully")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {e}")
        raise
    finally:
        db.close()


def _seed_users(db: Session):
    users = [
        User(username="admin",   email="admin@smartcity.gov",   hashed_password=hash_password("admin123"),   role="admin"),
        User(username="analyst", email="analyst@smartcity.gov", hashed_password=hash_password("analyst123"), role="analyst"),
        User(username="viewer",  email="viewer@smartcity.gov",  hashed_password=hash_password("viewer123"),  role="viewer"),
    ]
    db.add_all(users)
    db.flush()


def _seed_zones(db: Session):
    zone_objs = []
    for z in ZONES:
        obj = Zone(name=z["name"], zone_type=z["zone_type"], latitude=z["lat"], longitude=z["lon"],
                   area_sqkm=z["area"], population=z["pop"])
        db.add(obj)
        zone_objs.append(obj)
    db.flush()
    return zone_objs


def _seed_routes(db: Session):
    route_objs = []
    for r in ROUTES:
        obj = TransportRoute(route_name=r["name"], route_type=r["type"], from_zone=r["from"],
                              to_zone=r["to"], distance_km=r["dist"], scheduled_duration_min=r["dur"])
        db.add(obj)
        route_objs.append(obj)
    db.flush()
    return route_objs


def _seed_traffic(db: Session, zones):
    np.random.seed(42)
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=30)

    # Base vehicle counts per zone type
    base_counts = {
        "downtown": 2800, "commercial": 1800, "residential": 900,
        "industrial": 600, "suburban": 500,
    }

    records = []
    for zone in zones:
        base = base_counts.get(zone.zone_type, 1000)
        ts = start
        while ts <= now:
            hf = hour_factor(ts.hour) * weekday_factor(ts.weekday())
            noise = np.random.normal(1.0, 0.08)
            count = max(0, int(base * hf * noise))
            speed = max(5, 80 - count / 60 + np.random.normal(0, 3))
            congestion = min(10, max(0, (count / base) * 5 + np.random.normal(0, 0.3)))
            incidents = np.random.poisson(0.05 if congestion < 6 else 0.2)
            records.append(TrafficData(zone_id=zone.id, timestamp=ts, vehicle_count=count,
                                       avg_speed_kmh=round(speed, 1), congestion_level=round(congestion, 2),
                                       incident_count=int(incidents)))
            ts += timedelta(hours=1)

    db.bulk_save_objects(records)
    db.flush()


def _seed_pollution(db: Session, zones):
    np.random.seed(43)
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=30)

    base_aqi = {
        "downtown": 95, "industrial": 145, "commercial": 80,
        "residential": 55, "suburban": 45,
    }

    records = []
    for zone in zones:
        base = base_aqi.get(zone.zone_type, 75)
        ts = start
        while ts <= now:
            hf = hour_factor(ts.hour) * weekday_factor(ts.weekday())
            season = 1 + 0.15 * np.sin(2 * np.pi * ts.timetuple().tm_yday / 365)
            aqi = max(10, base * hf * season * np.random.normal(1, 0.1))
            co2 = 400 + (aqi - 50) * 0.8 + np.random.normal(0, 5)
            pm25 = max(0, aqi * 0.22 + np.random.normal(0, 2))
            pm10 = pm25 * 1.8 + np.random.normal(0, 3)
            temp = 22 + 8 * np.sin(2 * np.pi * (ts.hour - 14) / 24) + np.random.normal(0, 1.5)
            humidity = 60 - 0.3 * temp + np.random.normal(0, 5)
            no2 = max(0, aqi * 0.15 + np.random.normal(0, 3))
            records.append(PollutionData(zone_id=zone.id, timestamp=ts, aqi=round(aqi, 1),
                                          co2_ppm=round(co2, 1), pm25_ugm3=round(pm25, 2),
                                          pm10_ugm3=round(pm10, 2), temperature_c=round(temp, 1),
                                          humidity_pct=round(min(100, max(0, humidity)), 1),
                                          no2_ppb=round(no2, 2)))
            ts += timedelta(hours=1)

    db.bulk_save_objects(records)
    db.flush()


def _seed_transport(db: Session, routes):
    np.random.seed(44)
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=30)

    records = []
    for route in routes:
        ts = start
        while ts <= now:
            hf = hour_factor(ts.hour)
            capacity = 80 if route.route_type == "metro" else 50
            passengers = max(0, int(capacity * hf * np.random.normal(0.75, 0.15)))
            occupancy = min(100, passengers / capacity * 100)
            # Delays higher during rush hour
            base_delay = 0.5 if route.route_type == "metro" else 2.0
            delay = max(0, np.random.exponential(base_delay * (1 + 0.5 * hf)))
            on_time = delay < 5
            records.append(TransportReading(route_id=route.id, timestamp=ts, passenger_count=passengers,
                                             delay_minutes=round(delay, 1), occupancy_pct=round(occupancy, 1),
                                             on_time=on_time))
            ts += timedelta(hours=1)

    db.bulk_save_objects(records)
    db.flush()


def _seed_energy(db: Session, zones):
    np.random.seed(45)
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=30)

    sector_base = {
        "residential": {"residential": 1200, "commercial": 200},
        "commercial":  {"commercial": 3500, "residential": 300},
        "industrial":  {"industrial": 8000, "commercial": 500},
        "downtown":    {"commercial": 5000, "residential": 800, "government": 1200},
        "suburban":    {"residential": 900, "commercial": 150},
    }

    records = []
    for zone in zones:
        sectors = sector_base.get(zone.zone_type, {"residential": 600})
        for sector, base_kwh in sectors.items():
            ts = start
            while ts <= now:
                hf = hour_factor(ts.hour) * weekday_factor(ts.weekday())
                consumption = max(0, base_kwh * hf * np.random.normal(1.0, 0.07))
                peak = consumption * np.random.uniform(0.8, 1.3)
                is_anomaly = np.random.random() < 0.01  # 1% anomaly rate
                if is_anomaly:
                    consumption *= np.random.uniform(1.5, 2.5)
                cost = consumption * 0.12  # $0.12/kWh
                records.append(EnergyData(zone_id=zone.id, timestamp=ts, sector=sector,
                                           consumption_kwh=round(consumption, 2), peak_demand_kw=round(peak, 2),
                                           is_anomaly=is_anomaly, cost_usd=round(cost, 2)))
                ts += timedelta(hours=1)

    db.bulk_save_objects(records)
    db.flush()


def _seed_alerts(db: Session, zones):
    np.random.seed(46)
    now = datetime.utcnow()

    sample_alerts = [
        {"category": "traffic",    "severity": "high",     "title": "Severe Congestion Detected",      "msg": "Vehicle density exceeds 200% of average in Downtown Core. Recommend activating alternate routes."},
        {"category": "pollution",  "severity": "critical", "title": "Dangerous AQI Level",             "msg": "AQI in Industrial East has reached 185 (Unhealthy). Immediate action required."},
        {"category": "transport",  "severity": "medium",   "title": "Multiple Route Delays",           "msg": "Routes 1, 3, and 6 experiencing delays of 15+ minutes due to track maintenance."},
        {"category": "energy",     "severity": "high",     "title": "Energy Overload Warning",         "msg": "Peak demand in Commercial district exceeds grid capacity by 18%. Load shedding may be required."},
        {"category": "pollution",  "severity": "medium",   "title": "PM2.5 Elevated",                  "msg": "Fine particulate matter levels in West Commercial are 2x safe limits. Advise residents to limit outdoor activity."},
        {"category": "traffic",    "severity": "medium",   "title": "Road Incident Reported",          "msg": "3 vehicle collision on Highway 4 near South Port is causing traffic backup."},
        {"category": "energy",     "severity": "low",      "title": "Anomalous Power Consumption",     "msg": "Unusual energy spike detected in Sector 7 of Green Valley at 3:00 AM."},
        {"category": "transport",  "severity": "low",      "title": "Bus Route Overcrowding",          "msg": "Route 5 reporting 120% occupancy during morning peak. Additional vehicles deployed."},
    ]

    alert_objs = []
    for i, a in enumerate(sample_alerts):
        zone = zones[i % len(zones)]
        ts = now - timedelta(hours=np.random.randint(1, 72))
        alert_objs.append(Alert(timestamp=ts, category=a["category"], severity=a["severity"],
                                 zone_id=zone.id, title=a["title"], message=a["msg"],
                                 is_read=np.random.random() > 0.5, is_resolved=np.random.random() > 0.7))

    db.add_all(alert_objs)
    db.flush()
