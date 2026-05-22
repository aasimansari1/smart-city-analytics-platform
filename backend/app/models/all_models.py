from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="viewer")  # admin, analyst, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    zone_type = Column(String)  # downtown, residential, industrial, commercial, suburban
    latitude = Column(Float)
    longitude = Column(Float)
    area_sqkm = Column(Float)
    population = Column(Integer)


class TrafficData(Base):
    __tablename__ = "traffic_data"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    timestamp = Column(DateTime, index=True)
    vehicle_count = Column(Integer)
    avg_speed_kmh = Column(Float)
    congestion_level = Column(Float)  # 0-10 scale
    incident_count = Column(Integer, default=0)
    zone = relationship("Zone")


class PollutionData(Base):
    __tablename__ = "pollution_data"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    timestamp = Column(DateTime, index=True)
    aqi = Column(Float)
    co2_ppm = Column(Float)
    pm25_ugm3 = Column(Float)
    pm10_ugm3 = Column(Float)
    temperature_c = Column(Float)
    humidity_pct = Column(Float)
    no2_ppb = Column(Float)
    zone = relationship("Zone")


class TransportRoute(Base):
    __tablename__ = "transport_routes"
    id = Column(Integer, primary_key=True, index=True)
    route_name = Column(String)
    route_type = Column(String)  # bus, metro, tram
    from_zone = Column(String)
    to_zone = Column(String)
    distance_km = Column(Float)
    scheduled_duration_min = Column(Integer)
    readings = relationship("TransportReading", back_populates="route")


class TransportReading(Base):
    __tablename__ = "transport_readings"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("transport_routes.id"))
    timestamp = Column(DateTime, index=True)
    passenger_count = Column(Integer)
    delay_minutes = Column(Float)
    occupancy_pct = Column(Float)
    on_time = Column(Boolean)
    route = relationship("TransportRoute", back_populates="readings")


class EnergyData(Base):
    __tablename__ = "energy_data"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    timestamp = Column(DateTime, index=True)
    sector = Column(String)  # residential, commercial, industrial, government
    consumption_kwh = Column(Float)
    peak_demand_kw = Column(Float)
    is_anomaly = Column(Boolean, default=False)
    cost_usd = Column(Float)
    zone = relationship("Zone")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    category = Column(String)  # traffic, pollution, transport, energy
    severity = Column(String)  # low, medium, high, critical
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    title = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    zone = relationship("Zone")
