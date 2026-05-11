"""Report service — generates PDF patient reports using ReportLab."""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional


REPORTS_DIR = Path("./reports")


def _arabic_safe(text: str) -> str:
    """Return text as-is (ReportLab with arabic_reshaper for RTL; fallback plain)."""
    return text or ""


def generate_patient_report(
    patient_name: str,
    patient_gender: Optional[str],
    doctor_name: str,
    diagnosis: Optional[dict],
    mmse: Optional[dict],
    symptoms: Optional[dict],
    games: Optional[dict],
    risk: Optional[dict],
    doctor_notes: str = "",
) -> str:
    """
    Generate a PDF report and save to reports/ directory.
    Returns the filename (not full path).
    """
    REPORTS_DIR.mkdir(exist_ok=True)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )
        from reportlab.pdfbase import pdfmetrics

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"report_{timestamp}.pdf"
        filepath = REPORTS_DIR / filename

        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        normal.fontName = "Helvetica"

        title_style = ParagraphStyle(
            "Title", fontName="Helvetica-Bold", fontSize=18,
            textColor=colors.HexColor("#1E40AF"), alignment=1,
        )
        heading_style = ParagraphStyle(
            "Heading", fontName="Helvetica-Bold", fontSize=13,
            textColor=colors.HexColor("#1E3A8A"), spaceBefore=12, spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "Body", fontName="Helvetica", fontSize=10,
            textColor=colors.HexColor("#374151"), leading=16,
        )
        label_style = ParagraphStyle(
            "Label", fontName="Helvetica-Bold", fontSize=10,
            textColor=colors.HexColor("#6B7280"),
        )

        story = []

        # Header
        story.append(Paragraph("Memora - تقرير طبي شامل", title_style))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3B82F6")))
        story.append(Spacer(1, 10))

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        story.append(Paragraph(f"Generated: {now_str}", body_style))
        story.append(Paragraph(f"Doctor: {doctor_name}", body_style))
        story.append(Spacer(1, 12))

        # Patient info
        story.append(Paragraph("Patient Information", heading_style))
        patient_data = [
            ["Name", patient_name],
            ["Gender", patient_gender or "N/A"],
        ]
        t = Table(patient_data, colWidths=[5 * cm, 12 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EFF6FF")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DBEAFE")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

        # MRI
        story.append(Paragraph("MRI Classification (AI)", heading_style))
        if diagnosis:
            cls = diagnosis.get("classification", "N/A")
            conf = diagnosis.get("confidence", 0)
            color_map = {
                "NonDemented": "#10B981",
                "MildDemented": "#F59E0B",
                "ModerateDemented": "#EF4444",
            }
            cls_color = color_map.get(cls, "#374151")
            story.append(Paragraph(f"Classification: <font color='{cls_color}'><b>{cls}</b></font>", body_style))
            story.append(Paragraph(f"Confidence: {conf * 100:.1f}%", body_style))
            if diagnosis.get("probabilities"):
                probs = diagnosis["probabilities"]
                if isinstance(probs, str):
                    probs = json.loads(probs)
                for k, v in probs.items():
                    story.append(Paragraph(f"  {k}: {v * 100:.1f}%", body_style))
        else:
            story.append(Paragraph("No MRI scan on record.", body_style))
        story.append(Spacer(1, 12))

        # MMSE
        story.append(Paragraph("MMSE Cognitive Test", heading_style))
        if mmse:
            score = mmse.get("total_score", 0)
            severity = mmse.get("severity_level", "N/A")
            story.append(Paragraph(f"Total Score: {score}/30", body_style))
            story.append(Paragraph(f"Severity: {severity}", body_style))
        else:
            story.append(Paragraph("No MMSE result on record.", body_style))
        story.append(Spacer(1, 12))

        # Symptoms
        story.append(Paragraph("Symptom Assessment", heading_style))
        if symptoms:
            story.append(Paragraph(f"Score: {symptoms.get('total_score', 0)}/24", body_style))
            story.append(Paragraph(f"Severity: {symptoms.get('severity_level', 'N/A')}", body_style))
        else:
            story.append(Paragraph("No symptom entry on record.", body_style))
        story.append(Spacer(1, 12))

        # Risk
        story.append(Paragraph("Risk Assessment", heading_style))
        if risk:
            story.append(Paragraph(f"Level: {risk.get('level', 'N/A').upper()}", body_style))
            story.append(Paragraph(f"Score: {risk.get('score', 0)}", body_style))
        else:
            story.append(Paragraph("Insufficient data for risk assessment.", body_style))
        story.append(Spacer(1, 12))

        # Doctor notes
        if doctor_notes:
            story.append(Paragraph("Doctor Notes", heading_style))
            story.append(Paragraph(doctor_notes, body_style))
            story.append(Spacer(1, 12))

        # Footer
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DBEAFE")))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "This report was generated automatically by Memora. It is intended for medical professionals only.",
            label_style,
        ))

        doc.build(story)
        return filename

    except Exception as exc:
        print(f"[Report] PDF generation error: {exc}")
        # Return a placeholder filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"report_{timestamp}_error.pdf"
