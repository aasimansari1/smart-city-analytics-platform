from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.all_models import Alert

router = APIRouter()


@router.get("/")
def get_alerts(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(Alert)
    if category:
        q = q.filter(Alert.category == category)
    if severity:
        q = q.filter(Alert.severity == severity)
    if resolved is not None:
        q = q.filter(Alert.is_resolved == resolved)
    rows = q.order_by(Alert.timestamp.desc()).limit(limit).all()
    return [{"id": a.id, "timestamp": a.timestamp.isoformat(), "category": a.category,
             "severity": a.severity, "zone_name": a.zone.name if a.zone else "City-wide",
             "title": a.title, "message": a.message,
             "is_read": a.is_read, "is_resolved": a.is_resolved} for a in rows]


@router.post("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"success": True}


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_resolved = True
        alert.is_read = True
        db.commit()
    return {"success": True}


@router.get("/summary")
def get_alert_summary(db: Session = Depends(get_db)):
    total = db.query(Alert).count()
    unread = db.query(Alert).filter(Alert.is_read == False).count()
    unresolved = db.query(Alert).filter(Alert.is_resolved == False).count()
    by_severity = {}
    for sev in ["low", "medium", "high", "critical"]:
        by_severity[sev] = db.query(Alert).filter(Alert.severity == sev).count()
    by_category = {}
    for cat in ["traffic", "pollution", "transport", "energy"]:
        by_category[cat] = db.query(Alert).filter(Alert.category == cat).count()
    return {"total": total, "unread": unread, "unresolved": unresolved,
            "by_severity": by_severity, "by_category": by_category}
