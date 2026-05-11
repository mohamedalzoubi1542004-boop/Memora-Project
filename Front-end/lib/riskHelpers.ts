/** Client-side risk computation — mirrors Back-end/app/services/risk_service.py */

export function compute_risk_label(
  mriClass: string | null,
  mmseScore: number | null,
  symptomScore: number | null,
): string {
  let points = 0;

  if (mriClass) {
    points += ({ NonDemented: 0, MildDemented: 2, ModerateDemented: 3 }[mriClass] ?? 0);
  }
  if (mmseScore != null) {
    points += mmseScore >= 24 ? 0 : mmseScore >= 18 ? 2 : 3;
  }
  if (symptomScore != null) {
    points += symptomScore <= 6 ? 0 : symptomScore <= 14 ? 2 : 3;
  }

  if (points <= 1) return "low";
  if (points <= 4) return "medium";
  if (points <= 7) return "high";
  return "critical";
}
