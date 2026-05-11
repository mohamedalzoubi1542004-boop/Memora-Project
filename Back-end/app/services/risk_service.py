"""Risk assessment service — combines MRI + MMSE + Symptoms into a single risk level."""

from typing import Optional, Dict


def compute_risk(
    mri_classification: Optional[str],
    mmse_score: Optional[int],
    symptom_score: Optional[int],
) -> Dict:
    """
    Returns:
        {
          "level": "low" | "medium" | "high" | "critical",
          "color": "#...",
          "score": int,
          "breakdown": {...}
        }
    """
    points = 0
    breakdown = {}

    # MRI contribution
    if mri_classification:
        mri_points = {
            "NonDemented": 0,
            "MildDemented": 2,
            "ModerateDemented": 3,
        }.get(mri_classification, 0)
        points += mri_points
        breakdown["mri"] = mri_points

    # MMSE contribution
    if mmse_score is not None:
        if mmse_score >= 24:
            mmse_points = 0
        elif mmse_score >= 18:
            mmse_points = 2
        else:
            mmse_points = 3
        points += mmse_points
        breakdown["mmse"] = mmse_points

    # Symptom contribution
    if symptom_score is not None:
        if symptom_score <= 6:
            symptom_points = 0
        elif symptom_score <= 14:
            symptom_points = 2
        else:
            symptom_points = 3
        points += symptom_points
        breakdown["symptoms"] = symptom_points

    if points <= 1:
        level, color = "low", "#10B981"
    elif points <= 4:
        level, color = "medium", "#F59E0B"
    elif points <= 7:
        level, color = "high", "#EF4444"
    else:
        level, color = "critical", "#7C3AED"

    return {"level": level, "color": color, "score": points, "breakdown": breakdown}


LEVEL_LABELS = {
    "low": "منخفض",
    "medium": "متوسط",
    "high": "مرتفع",
    "critical": "حرج",
}
