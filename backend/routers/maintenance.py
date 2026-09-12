from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Optional, List
import json
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"], dependencies=[Depends(auth.get_current_user)])


# ---------------------------------------------------------------------------
# Rule-based trend classifier (mock ML service)
# ---------------------------------------------------------------------------

def classify_trend(readings: List[models.IoTReading], ext: Optional[models.FireExtinguisher] = None) -> dict:
    """
    Analyse the last N IoT readings for an extinguisher and return a
    plain-language fault description, root-cause classification, and
    confidence score.

    The readings list is expected to be ordered most-recent-first.
    """
    current_pressure = ext.pressure if ext and ext.pressure is not None else 100.0
    current_battery = ext.battery if ext and ext.battery is not None else 100.0
    current_status = (ext.status or "Healthy") if ext else "Healthy"

    if not readings or len(readings) < 2:
        if current_status == "Emergency" or current_pressure < 28.0:
            return {
                "fault_description": (
                    f"A critical pressure anomaly was detected with current level at {current_pressure:.1f}%, "
                    f"indicating a sudden discharge event, valve failure, or severe pressure leak."
                ),
                "root_cause": "Sudden discharge event or gauge failure",
                "confidence": 0.88,
            }
        elif current_status == "Low Pressure" or current_pressure < 40.0:
            return {
                "fault_description": (
                    f"Pressure has dropped below nominal operating threshold to {current_pressure:.1f}%, "
                    f"consistent with a slow leak from valve seat or stem O-ring degradation."
                ),
                "root_cause": "Valve seal degradation — slow leak",
                "confidence": 0.84,
            }
        elif current_battery < 30.0:
            return {
                "fault_description": (
                    f"The IoT telemetry sensor battery is critically depleted at {current_battery:.1f}%, "
                    f"requiring sensor battery replacement."
                ),
                "root_cause": "Battery end-of-life",
                "confidence": 0.90,
            }
        elif current_status == "Maintenance Due":
            return {
                "fault_description": (
                    f"The extinguisher has reached its scheduled maintenance interval. "
                    f"Standard preventive inspection, nozzle/pin verification, and tag renewal required."
                ),
                "root_cause": "Scheduled preventive maintenance",
                "confidence": 0.80,
            }
        else:
            return {
                "fault_description": (
                    "Routine inspection flagged for scheduled preventive maintenance."
                ),
                "root_cause": "Scheduled preventive maintenance",
                "confidence": 0.65,
            }

    # Extract pressure and battery series (oldest → newest for intuitive deltas)
    pressures = [r.pressure if r.pressure is not None else current_pressure for r in reversed(readings)]
    batteries = [getattr(r, 'battery', None) if getattr(r, 'battery', None) is not None else current_battery for r in reversed(readings)]
    timestamps = [r.timestamp if r.timestamp is not None else datetime.utcnow() for r in reversed(readings)]

    n = len(pressures)
    time_span_days = max((timestamps[-1] - timestamps[0]).total_seconds() / 86400, 0.01)

    # --- Pressure analysis ---
    pressure_deltas = [pressures[i + 1] - pressures[i] for i in range(n - 1)]
    total_pressure_drop = pressures[0] - pressures[-1]  # positive = declining
    avg_drop_per_reading = total_pressure_drop / max(n - 1, 1)
    rate_per_day = total_pressure_drop / time_span_days

    # Check for a single sudden drop (>20% between consecutive readings)
    max_single_drop = max((-d for d in pressure_deltas), default=0)

    # --- Battery analysis ---
    battery_deltas = [batteries[i + 1] - batteries[i] for i in range(n - 1)]
    total_battery_drop = batteries[0] - batteries[-1]
    avg_battery_drop_per_reading = total_battery_drop / max(n - 1, 1)

    # Battery variance (for erratic detection)
    if len(battery_deltas) >= 2:
        mean_bd = sum(battery_deltas) / len(battery_deltas)
        battery_variance = sum((d - mean_bd) ** 2 for d in battery_deltas) / len(battery_deltas)
    else:
        battery_variance = 0.0

    # --- Classification rules (priority order) ---

    # 1) Sudden pressure drop or emergency
    if max_single_drop > 20 or current_status == "Emergency" or pressures[-1] < 28.0:
        return {
            "fault_description": (
                f"A critical reading showed pressure at {pressures[-1]:.1f}% (max drop {max_single_drop:.1f}%), "
                f"indicating a sudden discharge event or gauge malfunction "
                f"within the last {time_span_days:.0f}-day observation window."
            ),
            "root_cause": "Sudden discharge event or gauge failure",
            "confidence": 0.86,
        }

    # 2) Slow pressure leak (>2%/reading or low pressure)
    if (n >= 3 and avg_drop_per_reading > 2.0) or current_status == "Low Pressure" or pressures[-1] < 40.0:
        return {
            "fault_description": (
                f"Pressure declined to {pressures[-1]:.0f}% over the observation period "
                f"(~{rate_per_day:.1f}%/day), consistent with a slow leak from valve or seal degradation."
            ),
            "root_cause": "Valve seal degradation — slow leak",
            "confidence": 0.84,
        }

    # 3) Battery end-of-life
    if avg_battery_drop_per_reading > 5.0 or current_battery < 25.0:
        return {
            "fault_description": (
                f"Battery level dropped to {batteries[-1]:.0f}%, "
                f"indicating the IoT sensor battery is approaching end-of-life."
            ),
            "root_cause": "Battery end-of-life",
            "confidence": 0.88,
        }

    # 4) Erratic battery
    if battery_variance > 50.0 and abs(total_battery_drop) < 10:
        return {
            "fault_description": (
                f"Battery readings are erratic (variance {battery_variance:.1f}) "
                f"with no consistent decline, suggesting a sensor or wiring fault."
            ),
            "root_cause": "Sensor fault suspected",
            "confidence": 0.72,
        }

    # 5) Pressure flat but very low
    if pressures[-1] < 40 and abs(total_pressure_drop) < 10:
        return {
            "fault_description": (
                f"Pressure has been consistently low (~{pressures[-1]:.0f}%) "
                f"across {n} readings with minimal change, indicating the unit "
                f"is depleted and needs a full refill."
            ),
            "root_cause": "Unit depleted — needs refill",
            "confidence": 0.91,
        }

    # 6) Moderate pressure decline
    if total_pressure_drop > 8:
        return {
            "fault_description": (
                f"Pressure decreased by {total_pressure_drop:.1f}% ({pressures[0]:.0f}% → {pressures[-1]:.0f}%), "
                f"a gradual decline that may indicate an early-stage seal issue."
            ),
            "root_cause": "Valve seal degradation — slow leak",
            "confidence": 0.76,
        }

    # 7) Nothing abnormal
    return {
        "fault_description": (
            f"No anomalous pressure trends detected. Unit flagged for scheduled preventive maintenance."
        ),
        "root_cause": "Scheduled preventive maintenance",
        "confidence": 0.70,
    }


# ---------------------------------------------------------------------------
# Rule-based fix plan generator
# ---------------------------------------------------------------------------

def generate_fix_plan(
    root_cause: str,
    fault_description: str,
    ext: "models.FireExtinguisher",
) -> dict:
    """
    Return a structured fix plan dict based on the diagnosed root cause,
    the detailed fault description, and the extinguisher's metadata.
    """
    ext_type = (ext.type or "Dry Chemical").strip()
    capacity = (ext.capacity or "5kg").strip()

    # Material cost modifiers by extinguisher type
    agent_refill_cost = {
        "CO2": 1800,
        "Foam": 1200,
        "Water": 600,
        "Dry Chemical": 900,
    }.get(ext_type, 900)

    plans: dict[str, dict] = {
        "Sudden discharge event or gauge failure": {
            "problem_summary": (
                f"The {ext_type} extinguisher ({capacity}) experienced a sudden large "
                f"pressure drop indicating either an accidental discharge or a faulty "
                f"pressure gauge giving incorrect readings."
            ),
            "solution_steps": [
                "Visually inspect the nozzle, hose, and safety pin for signs of discharge.",
                "Check the pressure gauge for physical damage or stuck needle.",
                "If discharged: fully refill the extinguishing agent and re-pressurise.",
                "If gauge fault: replace the pressure gauge assembly.",
                "Perform a leak-down test to confirm seal integrity after repair.",
                "Update the inspection tag and log the service.",
            ],
            "materials": [
                {"name": f"{ext_type} agent refill ({capacity})", "quantity": 1, "unit_cost": agent_refill_cost},
                {"name": "Pressure gauge assembly", "quantity": 1, "unit_cost": 450},
                {"name": "Safety pin & tamper seal", "quantity": 1, "unit_cost": 50},
            ],
            "estimated_cost": agent_refill_cost + 500,
            "estimated_time_minutes": 45,
        },
        "Valve seal degradation — slow leak": {
            "problem_summary": (
                f"The {ext_type} extinguisher ({capacity}) shows a gradual pressure "
                f"decline consistent with a slow leak, most likely from worn valve "
                f"O-rings or degraded stem seals."
            ),
            "solution_steps": [
                "Depressurise the unit safely and remove the valve assembly.",
                "Inspect the valve stem O-rings and seat seals for wear or cracking.",
                "Replace all worn O-rings and seals with manufacturer-spec parts.",
                "Reassemble the valve and re-pressurise to rated PSI.",
                "Perform a 30-minute leak-down test to verify the repair.",
                "Update the inspection tag and log the service.",
            ],
            "materials": [
                {"name": "Valve O-ring kit", "quantity": 1, "unit_cost": 250},
                {"name": "Stem seal set", "quantity": 1, "unit_cost": 180},
                {"name": "Nitrogen re-charge", "quantity": 1, "unit_cost": 350},
            ],
            "estimated_cost": 780,
            "estimated_time_minutes": 60,
        },
        "Battery end-of-life": {
            "problem_summary": (
                f"The IoT sensor attached to the {ext_type} extinguisher ({capacity}) "
                f"is reporting rapidly declining battery levels, indicating the sensor "
                f"battery has reached end-of-life."
            ),
            "solution_steps": [
                "Power down the IoT sensor module.",
                "Remove the old battery pack from the sensor housing.",
                "Install a new 3.7V Li-ion battery (or as specified by the sensor model).",
                "Power on the sensor and verify telemetry is transmitting correctly.",
                "Confirm pressure and temperature readings match manual gauge values.",
            ],
            "materials": [
                {"name": "IoT sensor battery (3.7V Li-ion)", "quantity": 1, "unit_cost": 320},
                {"name": "Battery housing gasket", "quantity": 1, "unit_cost": 40},
            ],
            "estimated_cost": 360,
            "estimated_time_minutes": 20,
        },
        "Sensor fault suspected": {
            "problem_summary": (
                f"The IoT sensor on the {ext_type} extinguisher ({capacity}) is "
                f"producing erratic battery readings with no clear trend, suggesting "
                f"a hardware fault in the sensor or its wiring."
            ),
            "solution_steps": [
                "Inspect wiring connections between the sensor and the battery.",
                "Check for corrosion or loose terminals.",
                "Test the sensor module with a known-good battery.",
                "If readings remain erratic, replace the entire sensor module.",
                "Recalibrate and verify telemetry output.",
            ],
            "materials": [
                {"name": "IoT sensor module (replacement)", "quantity": 1, "unit_cost": 1500},
                {"name": "Wiring harness", "quantity": 1, "unit_cost": 120},
                {"name": "Anti-corrosion contact spray", "quantity": 1, "unit_cost": 80},
            ],
            "estimated_cost": 1700,
            "estimated_time_minutes": 40,
        },
        "Unit depleted — needs refill": {
            "problem_summary": (
                f"The {ext_type} extinguisher ({capacity}) is fully depleted with "
                f"pressure consistently at critically low levels. The unit needs a "
                f"complete agent refill and re-pressurisation."
            ),
            "solution_steps": [
                "Remove the extinguisher from its mounting bracket.",
                "Depressurise and evacuate any remaining agent.",
                "Inspect the cylinder interior for corrosion (hydrostatic test if due).",
                f"Refill with {ext_type} agent to manufacturer specification.",
                "Re-pressurise to rated PSI and perform a leak test.",
                "Remount, attach a new inspection tag, and verify IoT sensor link.",
            ],
            "materials": [
                {"name": f"{ext_type} agent refill ({capacity})", "quantity": 1, "unit_cost": agent_refill_cost},
                {"name": "Nitrogen re-charge", "quantity": 1, "unit_cost": 350},
                {"name": "Inspection tag", "quantity": 1, "unit_cost": 30},
            ],
            "estimated_cost": agent_refill_cost + 380,
            "estimated_time_minutes": 50,
        },
        "Scheduled preventive maintenance": {
            "problem_summary": (
                f"The {ext_type} extinguisher ({capacity}) has no anomalous sensor "
                f"readings but is due for scheduled preventive maintenance as per "
                f"the inspection calendar."
            ),
            "solution_steps": [
                "Visually inspect the cylinder body for dents, corrosion, or damage.",
                "Verify the pressure gauge reading matches IoT sensor data.",
                "Check the nozzle, hose, and safety pin for damage or obstruction.",
                "Verify the mounting bracket is secure.",
                "Clean the unit and attach a new inspection tag.",
            ],
            "materials": [
                {"name": "Inspection tag", "quantity": 1, "unit_cost": 30},
                {"name": "Cleaning supplies", "quantity": 1, "unit_cost": 50},
            ],
            "estimated_cost": 80,
            "estimated_time_minutes": 15,
        },
    }

    plan = plans.get(root_cause, plans["Scheduled preventive maintenance"])

    # Enrich with context
    plan["root_cause"] = root_cause
    plan["fault_description"] = fault_description
    plan["extinguisher_type"] = ext_type
    plan["extinguisher_capacity"] = capacity

    return plan


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_logs_for_flagged_units(db: Session):
    """
    Auto-create a MaintenanceLog for every extinguisher that has a non-Healthy
    status but no existing Pending log.  This ensures every flagged unit shows
    up as a work order in the technician checklist.
    """
    flagged_statuses = ["Maintenance Due", "Inspection Pending", "Low Pressure", "Emergency"]
    flagged = (
        db.query(models.FireExtinguisher)
        .filter(models.FireExtinguisher.status.in_(flagged_statuses))
        .all()
    )
    for ext in flagged:
        existing = (
            db.query(models.MaintenanceLog)
            .filter(
                models.MaintenanceLog.extinguisher_id == ext.id,
                models.MaintenanceLog.status == "Pending",
            )
            .first()
        )
        if not existing:
            log = models.MaintenanceLog(
                extinguisher_id=ext.id,
                technician_id=None,
                task_description=f"Auto-generated work order — {ext.status}",
                status="Pending",
                scheduled_date=datetime.utcnow(),
            )
            db.add(log)
    db.commit()


def _log_to_response(log: models.MaintenanceLog, db: Session) -> dict:
    """Serialize a MaintenanceLog ORM object into a dict with computed fields."""
    tech_name = None
    if log.technician_id:
        user = db.query(models.User).filter(models.User.id == log.technician_id).first()
        if user:
            tech_name = user.full_name

    time_to_fix = None
    if log.started_at and log.completed_at:
        time_to_fix = (log.completed_at - log.started_at).total_seconds()

    # Parse stored fix_plan JSON if present
    fix_plan = None
    if log.fix_plan:
        try:
            fix_plan = json.loads(log.fix_plan)
        except (json.JSONDecodeError, TypeError):
            fix_plan = None

    return {
        "id": log.id,
        "extinguisher_id": log.extinguisher_id,
        "technician_id": log.technician_id,
        "task_description": log.task_description,
        "status": log.status,
        "notes": log.notes,
        "scheduled_date": log.scheduled_date.isoformat() if log.scheduled_date else None,
        "completed_date": log.completed_date.isoformat() if log.completed_date else None,
        "fault_description": log.fault_description,
        "root_cause": log.root_cause,
        "confidence": log.confidence,
        "fix_notes": log.fix_notes,
        "fix_plan": fix_plan,
        "started_at": log.started_at.isoformat() if log.started_at else None,
        "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        "time_to_fix": time_to_fix,
        "technician_name": tech_name,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/logs")
def list_maintenance_logs(
    status: Optional[str] = Query(None, description="Filter: Pending, Completed, or omit for all"),
    db: Session = Depends(get_db),
):
    """Return maintenance logs, optionally filtered by status."""
    _ensure_logs_for_flagged_units(db)

    query = db.query(models.MaintenanceLog).order_by(desc(models.MaintenanceLog.id))
    if status and status.lower() != "all":
        query = query.filter(models.MaintenanceLog.status == status)

    logs = query.all()
    return [_log_to_response(log, db) for log in logs]


@router.post("/{log_id}/inspect")
def run_ai_inspection(
    log_id: int,
    db: Session = Depends(get_db),
):
    """Run rule-based fault analysis on the extinguisher linked to this log."""
    log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    # Set started_at if this is the first interaction
    if log.started_at is None:
        log.started_at = datetime.utcnow()

    # Fetch extinguisher
    ext = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == log.extinguisher_id).first()

    # Fetch last 10 readings for the linked extinguisher
    readings = (
        db.query(models.IoTReading)
        .filter(models.IoTReading.extinguisher_id == log.extinguisher_id)
        .order_by(desc(models.IoTReading.timestamp))
        .limit(10)
        .all()
    )

    result = classify_trend(readings, ext)

    log.fault_description = result["fault_description"]
    log.root_cause = result["root_cause"]
    log.confidence = result["confidence"]

    db.commit()
    db.refresh(log)

    return {
        "maintenance_log_id": log.id,
        "extinguisher_id": log.extinguisher_id,
        "fault_description": result["fault_description"],
        "root_cause": result["root_cause"],
        "confidence": result["confidence"],
    }


@router.post("/{log_id}/fix-plan")
def generate_fix_plan_endpoint(
    log_id: int,
    db: Session = Depends(get_db),
):
    """Generate a detailed fix recommendation for a maintenance log."""
    log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    ext = (
        db.query(models.FireExtinguisher)
        .filter(models.FireExtinguisher.id == log.extinguisher_id)
        .first()
    )
    if not ext:
        raise HTTPException(status_code=404, detail="Extinguisher not found")

    # Auto-inspect if not already analyzed
    if not log.root_cause:
        if log.started_at is None:
            log.started_at = datetime.utcnow()
        readings = (
            db.query(models.IoTReading)
            .filter(models.IoTReading.extinguisher_id == log.extinguisher_id)
            .order_by(desc(models.IoTReading.timestamp))
            .limit(10)
            .all()
        )
        insp_result = classify_trend(readings, ext)
        log.fault_description = insp_result["fault_description"]
        log.root_cause = insp_result["root_cause"]
        log.confidence = insp_result["confidence"]

    plan = generate_fix_plan(log.root_cause, log.fault_description or "", ext)

    # Persist the plan
    log.fix_plan = json.dumps(plan)
    db.commit()
    db.refresh(log)

    return {
        "maintenance_log_id": log.id,
        "extinguisher_id": log.extinguisher_id,
        "fault_description": log.fault_description,
        "root_cause": log.root_cause,
        "confidence": log.confidence,
        "fix_plan": plan,
    }


@router.post("/{log_id}/complete")
def complete_maintenance(
    log_id: int,
    body: schemas.MaintenanceCompleteRequest,
    db: Session = Depends(get_db),
):
    """Mark a maintenance log as completed."""
    log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    if log.status == "Completed":
        raise HTTPException(status_code=400, detail="Log already completed")

    # If started_at was never set (inspect was skipped), set it now
    if log.started_at is None:
        log.started_at = datetime.utcnow()

    # Get a default technician for demo purposes
    tech = db.query(models.User).first()
    tech_id = tech.id if tech else None

    log.completed_at = datetime.utcnow()
    log.status = "Completed"
    log.fix_notes = body.fix_notes
    log.technician_id = tech_id
    log.completed_date = log.completed_at

    # Update extinguisher based on fixability
    ext = (
        db.query(models.FireExtinguisher)
        .filter(models.FireExtinguisher.id == log.extinguisher_id)
        .first()
    )
    if ext:
        if body.is_fixable:
            ext.status = "Healthy"
            ext.pressure = 100.0
            ext.last_inspection_date = datetime.utcnow()
        else:
            # Automated Replacement Workflow
            storage_unit = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.lifecycle_state == "IN_STORAGE").first()
            if not storage_unit:
                alert = models.Alert(
                    extinguisher_id=ext.id,
                    type="Critical Low Stock",
                    message="Failed to replace unit: No IN_STORAGE units available.",
                    is_resolved=False
                )
                db.add(alert)
                db.commit()
                raise HTTPException(status_code=400, detail="No IN_STORAGE units available for replacement. Critical Low Stock alert generated.")
            
            # Swap location
            old_location = ext.location_id
            
            # 3. Selected unit's location_id is reassigned to the defective unit's floor
            storage_unit.location_id = old_location
            storage_unit.lifecycle_state = "ACTIVE"
            storage_unit.status = "Healthy"
            storage_unit.pressure = 100.0
            
            # 4. Defective unit's status is set to DECOMMISSIONED and location_id is cleared
            ext.lifecycle_state = "DECOMMISSIONED"
            ext.location_id = None
            ext.status = "Defective"
            
            # 6. Auto-generate Alert and Maintenance Log
            alert = models.Alert(
                extinguisher_id=ext.id,
                type="Replacement",
                message=f"Unit {ext.extinguisher_id} replaced by {storage_unit.extinguisher_id} from storage.",
                is_resolved=False
            )
            db.add(alert)
            
            replacement_log = models.MaintenanceLog(
                extinguisher_id=ext.id,
                technician_id=tech_id,
                task_description=f"Unit replaced by {storage_unit.extinguisher_id}",
                status="Completed",
                notes="Automated replacement workflow triggered due to unfixable defect.",
                scheduled_date=datetime.utcnow(),
                completed_date=datetime.utcnow(),
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            db.add(replacement_log)

    db.commit()
    db.refresh(log)

    return _log_to_response(log, db)
