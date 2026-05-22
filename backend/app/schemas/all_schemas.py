from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "viewer"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class LoginRequest(BaseModel):
    username: str
    password: str


class ZoneOut(BaseModel):
    id: int
    name: str
    zone_type: str
    latitude: float
    longitude: float
    area_sqkm: float
    population: int

    class Config:
        from_attributes = True


class TrafficDataOut(BaseModel):
    id: int
    zone_id: int
    timestamp: datetime
    vehicle_count: int
    avg_speed_kmh: float
    congestion_level: float
    incident_count: int
    zone_name: Optional[str] = None

    class Config:
        from_attributes = True


class PollutionDataOut(BaseModel):
    id: int
    zone_id: int
    timestamp: datetime
    aqi: float
    co2_ppm: float
    pm25_ugm3: float
    pm10_ugm3: float
    temperature_c: float
    humidity_pct: float
    no2_ppb: float
    zone_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransportRouteOut(BaseModel):
    id: int
    route_name: str
    route_type: str
    from_zone: str
    to_zone: str
    distance_km: float
    scheduled_duration_min: int

    class Config:
        from_attributes = True


class TransportReadingOut(BaseModel):
    id: int
    route_id: int
    timestamp: datetime
    passenger_count: int
    delay_minutes: float
    occupancy_pct: float
    on_time: bool

    class Config:
        from_attributes = True


class EnergyDataOut(BaseModel):
    id: int
    zone_id: int
    timestamp: datetime
    sector: str
    consumption_kwh: float
    peak_demand_kw: float
    is_anomaly: bool
    cost_usd: float
    zone_name: Optional[str] = None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    timestamp: datetime
    category: str
    severity: str
    zone_id: Optional[int]
    title: str
    message: str
    is_read: bool
    is_resolved: bool
    zone_name: Optional[str] = None

    class Config:
        from_attributes = True


class PredictionRequest(BaseModel):
    module: str  # traffic, pollution, energy
    zone_id: int
    hours_ahead: int = 24


class PredictionOut(BaseModel):
    module: str
    zone_id: int
    zone_name: str
    timestamps: List[str]
    predictions: List[float]
    confidence: float
    model_accuracy: float
    metric_name: str
    unit: str


class DashboardKPI(BaseModel):
    avg_congestion: float
    avg_aqi: float
    total_energy_kwh: float
    transport_on_time_pct: float
    active_alerts: int
    zones_count: int
    trend_congestion: float
    trend_aqi: float
    trend_energy: float
