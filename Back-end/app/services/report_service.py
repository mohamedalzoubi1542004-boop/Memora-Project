"""Report service — generates PDF patient reports using ReportLab with Arabic support."""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

REPORTS_DIR = Path("./reports")

# Register Arabic-capable fonts once at module load
_FONT_REG = False

def _register_fonts():
    global _FONT_REG
    if _FONT_REG:
        return
    try:
        pdfmetrics.registerFont(TTFont("Arabic", r"C:\Windows\Fonts\arial.ttf"))
        pdfmetrics.registerFont(TTFont("Arabic-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
    except Exception:
        pdfmetrics.registerFont(TTFont("Arabic", r"C:\Windows\Fonts\tahoma.ttf"))
        pdfmetrics.registerFont(TTFont("Arabic-Bold", r"C:\Windows\Fonts\tahomabd.ttf"))
    _FONT_REG = True


def ar(text: str) -> str:
    """Reshape and apply bidi algorithm so Arabic renders correctly in ReportLab."""
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(str(text))
    return get_display(reshaped)


def _gender_ar(g: Optional[str]) -> str:
    if not g:
        return "غير محدد"
    return "ذكر" if g.lower() == "male" else "أنثى"


def _severity_ar(s: Optional[str]) -> str:
    mapping = {
        "normal": "طبيعي", "mild": "خفيف", "moderate": "متوسط",
        "severe": "شديد", "critical": "حرج",
    }
    return mapping.get((s or "").lower(), s or "—")


def _risk_ar(level: Optional[str]) -> str:
    mapping = {
        "low": "منخفض", "medium": "متوسط", "high": "مرتفع", "critical": "حرج",
    }
    return mapping.get((level or "").lower(), level or "—")


def _cls_ar(cls: Optional[str]) -> str:
    mapping = {
        "NonDemented": "غير مصاب بالخرف",
        "MildDemented": "خرف خفيف",
        "ModerateDemented": "خرف متوسط",
    }
    return mapping.get(cls or "", cls or "—")


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
    """Generate a PDF report and save to reports/. Returns the filename."""
    REPORTS_DIR.mkdir(exist_ok=True)
    _register_fonts()

    try:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename  = f"report_{timestamp}.pdf"
        filepath  = REPORTS_DIR / filename

        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=2 * cm, leftMargin=2 * cm,
            topMargin=2 * cm,  bottomMargin=2 * cm,
        )

        # ── Styles ────────────────────────────────────────────────────────────
        RTL = 2   # TA_RIGHT in ReportLab

        title_style = ParagraphStyle(
            "ATitle", fontName="Arabic-Bold", fontSize=18,
            textColor=colors.HexColor("#1E40AF"), alignment=1, leading=26,
        )
        heading_style = ParagraphStyle(
            "AHeading", fontName="Arabic-Bold", fontSize=13,
            textColor=colors.HexColor("#1E3A8A"),
            spaceBefore=14, spaceAfter=4, alignment=RTL, leading=20,
        )
        body_style = ParagraphStyle(
            "ABody", fontName="Arabic", fontSize=10,
            textColor=colors.HexColor("#374151"), leading=18, alignment=RTL,
        )
        meta_style = ParagraphStyle(
            "AMeta", fontName="Arabic", fontSize=9,
            textColor=colors.HexColor("#6B7280"), leading=15, alignment=RTL,
        )
        footer_style = ParagraphStyle(
            "AFooter", fontName="Arabic", fontSize=8,
            textColor=colors.HexColor("#9CA3AF"), alignment=1, leading=14,
        )

        tbl_style = TableStyle([
            ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#EFF6FF")),
            ("FONTNAME",    (0, 0), (-1, -1), "Arabic"),
            ("FONTSIZE",    (0, 0), (-1, -1), 10),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#DBEAFE")),
            ("PADDING",     (0, 0), (-1, -1), 7),
            ("ALIGN",       (0, 0), (-1, -1), "RIGHT"),
            ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ])

        story = []

        # ── Title ─────────────────────────────────────────────────────────────
        story.append(Paragraph(ar("Memora - تقرير طبي شامل"), title_style))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3B82F6")))
        story.append(Spacer(1, 10))

        now_str = datetime.utcnow().strftime("%Y-%m-%d  %H:%M  UTC")
        story.append(Paragraph(ar(f"تاريخ الإصدار: {now_str}"), meta_style))
        story.append(Paragraph(ar(f"الطبيب المعالج: {doctor_name}"), meta_style))
        story.append(Spacer(1, 14))

        # ── Patient info ──────────────────────────────────────────────────────
        story.append(Paragraph(ar("معلومات المريض"), heading_style))
        patient_data = [
            [ar("الاسم"),   ar(patient_name)],
            [ar("الجنس"),   ar(_gender_ar(patient_gender))],
        ]
        t = Table(patient_data, colWidths=[5 * cm, 12 * cm])
        t.setStyle(tbl_style)
        story.append(t)
        story.append(Spacer(1, 14))

        # ── MRI ───────────────────────────────────────────────────────────────
        story.append(Paragraph(ar("تصنيف صورة الرنين المغناطيسي (الذكاء الاصطناعي)"), heading_style))
        if diagnosis:
            cls  = diagnosis.get("classification", "N/A")
            conf = diagnosis.get("confidence", 0)
            color_map = {
                "NonDemented": "#10B981",
                "MildDemented": "#F59E0B",
                "ModerateDemented": "#EF4444",
            }
            cls_color = color_map.get(cls, "#374151")
            story.append(Paragraph(ar(f"التصنيف: {_cls_ar(cls)}  ({cls})"), body_style))
            story.append(Paragraph(ar(f"نسبة الثقة: {conf * 100:.1f}%"), body_style))
            if diagnosis.get("probabilities"):
                probs = diagnosis["probabilities"]
                if isinstance(probs, str):
                    probs = json.loads(probs)
                for k, v in probs.items():
                    story.append(Paragraph(ar(f"  {_cls_ar(k)}: {v * 100:.1f}%"), body_style))
        else:
            story.append(Paragraph(ar("لا توجد صورة رنين مغناطيسي مسجّلة."), body_style))
        story.append(Spacer(1, 14))

        # ── MMSE ──────────────────────────────────────────────────────────────
        story.append(Paragraph(ar("اختبار الإدراك المعرفي (MMSE)"), heading_style))
        if mmse:
            score    = mmse.get("total_score", 0)
            severity = mmse.get("severity_level", "")
            story.append(Paragraph(ar(f"الدرجة الإجمالية: {score} / 30"), body_style))
            story.append(Paragraph(ar(f"مستوى الشدة: {_severity_ar(severity)}"), body_style))
        else:
            story.append(Paragraph(ar("لا توجد نتيجة اختبار MMSE مسجّلة."), body_style))
        story.append(Spacer(1, 14))

        # ── Symptoms ──────────────────────────────────────────────────────────
        story.append(Paragraph(ar("تقييم الأعراض"), heading_style))
        if symptoms:
            story.append(Paragraph(ar(f"الدرجة: {symptoms.get('total_score', 0)} / 24"), body_style))
            story.append(Paragraph(ar(f"مستوى الشدة: {_severity_ar(symptoms.get('severity_level', ''))}"), body_style))
        else:
            story.append(Paragraph(ar("لا توجد بيانات أعراض مسجّلة."), body_style))
        story.append(Spacer(1, 14))

        # ── Risk ──────────────────────────────────────────────────────────────
        story.append(Paragraph(ar("تقييم درجة الخطورة"), heading_style))
        if risk:
            story.append(Paragraph(ar(f"مستوى الخطورة: {_risk_ar(risk.get('level'))}"), body_style))
            story.append(Paragraph(ar(f"المؤشر: {risk.get('score', 0)}"), body_style))
        else:
            story.append(Paragraph(ar("بيانات غير كافية لتقييم الخطورة."), body_style))
        story.append(Spacer(1, 14))

        # ── Doctor notes ──────────────────────────────────────────────────────
        if doctor_notes and doctor_notes.strip():
            story.append(Paragraph(ar("ملاحظات الطبيب"), heading_style))
            story.append(Paragraph(ar(doctor_notes), body_style))
            story.append(Spacer(1, 14))

        # ── Footer ────────────────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DBEAFE")))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            ar("تم توليد هذا التقرير تلقائياً بواسطة منصة Memora — مخصص للاستخدام الطبي المتخصص فقط."),
            footer_style,
        ))

        doc.build(story)
        return filename

    except Exception as exc:
        print(f"[Report] PDF generation error: {exc}")
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"report_{timestamp}_error.pdf"
