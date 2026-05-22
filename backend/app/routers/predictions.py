from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.all_models import Zone
from ..ml.models import (train_traffic_model, train_pollution_model, train_energy_model,
                          predict_future, get_model_confidence)

router = APIRouter()


def _get_zone(db, zone_id):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    return z


@router.get("/traffic/{zone_id}")
def predict_traffic(zone_id: int, hours_ahead: int = 24, db: Session = Depends(get_db)):
    zone = _get_zone(db, zone_id)
    try:
        model, scaler, metrics = train_traffic_model(db, zone_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    timestamps, preds = predict_future(model, scaler, hours_ahead)
    return {
        "module": "traffic", "zone_id": zone_id, "zone_name": zone.name,
        "timestamps": timestamps, "predictions": preds,
        "confidence": get_model_confidence(metrics),
        "model_accuracy": metrics["r2"], "mae": metrics["mae"], "rmse": metrics["rmse"],
        "metric_name": "Congestion Level", "unit": "score (0-10)",
    }


@router.get("/pollution/{zone_id}")
def predict_pollution(zone_id: int, hours_ahead: int = 24, db: Session = Depends(get_db)):
    zone = _get_zone(db, zone_id)
    try:
        model, scaler, metrics = train_pollution_model(db, zone_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    timestamps, preds = predict_future(model, scaler, hours_ahead)
    return {
        "module": "pollution", "zone_id": zone_id, "zone_name": zone.name,
        "timestamps": timestamps, "predictions": preds,
        "confidence": get_model_confidence(metrics),
        "model_accuracy": metrics["r2"], "mae": metrics["mae"], "rmse": metrics["rmse"],
        "metric_name": "AQI", "unit": "AQI",
    }


@router.get("/energy/{zone_id}")
def predict_energy(zone_id: int, hours_ahead: int = 24, db: Session = Depends(get_db)):
    zone = _get_zone(db, zone_id)
    try:
        model, scaler, metrics = train_energy_model(db, zone_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    timestamps, preds = predict_future(model, scaler, hours_ahead)
    return {
        "module": "energy", "zone_id": zone_id, "zone_name": zone.name,
        "timestamps": timestamps, "predictions": preds,
        "confidence": get_model_confidence(metrics),
        "model_accuracy": metrics["r2"], "mae": metrics["mae"], "rmse": metrics["rmse"],
        "metric_name": "Energy Consumption", "unit": "kWh",
    }


@router.get("/compare/{zone_id}")
def compare_models(zone_id: int, db: Session = Depends(get_db)):
    zone = _get_zone(db, zone_id)
    results = []
    for name, train_fn, metric, unit in [
        ("Traffic (Congestion)", train_traffic_model, "Congestion Level", "0-10"),
        ("Pollution (AQI)", train_pollution_model, "AQI", "AQI"),
        ("Energy (kWh)", train_energy_model, "Consumption", "kWh"),
    ]:
        try:
            _, _, metrics = train_fn(db, zone_id)
            results.append({
                "model": name, "zone": zone.name, "metric": metric, "unit": unit,
                "r2_score": metrics["r2"], "mae": metrics["mae"], "rmse": metrics["rmse"],
                "confidence": get_model_confidence(metrics),
                "algorithm": "Random Forest" if "Traffic" in name else "Gradient Boosting",
            })
        except ValueError:
            pass
    return results
