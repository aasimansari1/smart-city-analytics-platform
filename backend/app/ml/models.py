import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Tuple, List
import warnings
warnings.filterwarnings("ignore")


def _make_time_features(timestamps: list) -> np.ndarray:
    """Extract hour, day-of-week, day-of-month, month, and cyclical encodings."""
    feats = []
    for ts in timestamps:
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        h = ts.hour
        dow = ts.weekday()
        dom = ts.day
        month = ts.month
        feats.append([
            h, dow, dom, month,
            np.sin(2 * np.pi * h / 24),
            np.cos(2 * np.pi * h / 24),
            np.sin(2 * np.pi * dow / 7),
            np.cos(2 * np.pi * dow / 7),
            np.sin(2 * np.pi * month / 12),
            np.cos(2 * np.pi * month / 12),
        ])
    return np.array(feats)


def train_traffic_model(db: Session, zone_id: int) -> Tuple[object, object, dict]:
    from ..models.all_models import TrafficData
    rows = db.query(TrafficData).filter(TrafficData.zone_id == zone_id).order_by(TrafficData.timestamp).all()
    if len(rows) < 48:
        raise ValueError("Not enough data to train traffic model")

    timestamps = [r.timestamp for r in rows]
    y = np.array([r.congestion_level for r in rows])

    X = _make_time_features(timestamps)
    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    metrics = {
        "r2": round(r2_score(y_test, y_pred), 4),
        "mae": round(mean_absolute_error(y_test, y_pred), 4),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 4),
    }
    return model, scaler, metrics


def train_pollution_model(db: Session, zone_id: int) -> Tuple[object, object, dict]:
    from ..models.all_models import PollutionData
    rows = db.query(PollutionData).filter(PollutionData.zone_id == zone_id).order_by(PollutionData.timestamp).all()
    if len(rows) < 48:
        raise ValueError("Not enough data to train pollution model")

    timestamps = [r.timestamp for r in rows]
    y = np.array([r.aqi for r in rows])
    X = _make_time_features(timestamps)

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = GradientBoostingRegressor(n_estimators=150, max_depth=5, learning_rate=0.05, random_state=42)
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    metrics = {
        "r2": round(r2_score(y_test, y_pred), 4),
        "mae": round(mean_absolute_error(y_test, y_pred), 4),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 4),
    }
    return model, scaler, metrics


def train_energy_model(db: Session, zone_id: int) -> Tuple[object, object, dict]:
    from ..models.all_models import EnergyData
    rows = (db.query(EnergyData)
            .filter(EnergyData.zone_id == zone_id, EnergyData.is_anomaly == False)
            .order_by(EnergyData.timestamp).all())
    if len(rows) < 48:
        raise ValueError("Not enough data to train energy model")

    timestamps = [r.timestamp for r in rows]
    y = np.array([r.consumption_kwh for r in rows])
    X = _make_time_features(timestamps)

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = GradientBoostingRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42)
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    metrics = {
        "r2": round(r2_score(y_test, y_pred), 4),
        "mae": round(mean_absolute_error(y_test, y_pred), 4),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 4),
    }
    return model, scaler, metrics


def predict_future(model, scaler, hours_ahead: int, base_time: datetime = None) -> Tuple[List[str], List[float]]:
    if base_time is None:
        base_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

    future_ts = [base_time + timedelta(hours=i + 1) for i in range(hours_ahead)]
    X = _make_time_features(future_ts)
    X_s = scaler.transform(X)
    preds = model.predict(X_s).tolist()
    timestamps = [ts.isoformat() for ts in future_ts]
    return timestamps, [round(max(0, p), 2) for p in preds]


def get_model_confidence(metrics: dict) -> float:
    """Convert R² into a 0-100 confidence score."""
    r2 = metrics.get("r2", 0)
    return round(max(0, min(100, r2 * 100)), 1)
