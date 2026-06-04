"""Messages router — send, read, conversations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.family_contact import FamilyContact
from app.models.message import Message
from app.schemas.message_schema import MessageCreate, MessageOut, ConversationOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


def _care_relationship_exists(a: User, b: User, db: Session) -> bool:
    """True if users a and b have a legitimate care relationship to message each other."""
    # Admin may message anyone (support channel)
    if a.role == UserRole.ADMIN or b.role == UserRole.ADMIN:
        return True

    roles = {a.role, b.role}

    # Patient ↔ their assigned doctor
    if roles == {UserRole.PATIENT, UserRole.DOCTOR}:
        patient_user = a if a.role == UserRole.PATIENT else b
        doctor_user  = b if a.role == UserRole.PATIENT else a
        patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
        doctor  = db.query(Doctor).filter(Doctor.user_id == doctor_user.id).first()
        return bool(patient and doctor and patient.assigned_doctor_id == doctor.id)

    # Patient ↔ a registered family contact
    if roles == {UserRole.PATIENT, UserRole.FAMILY}:
        patient_user = a if a.role == UserRole.PATIENT else b
        family_user  = b if a.role == UserRole.PATIENT else a
        patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
        if not patient:
            return False
        return db.query(FamilyContact).filter(
            FamilyContact.patient_id == patient.id,
            FamilyContact.user_id == family_user.id,
        ).first() is not None

    # Doctor ↔ family of one of the doctor's patients
    if roles == {UserRole.DOCTOR, UserRole.FAMILY}:
        doctor_user = a if a.role == UserRole.DOCTOR else b
        family_user = b if a.role == UserRole.DOCTOR else a
        doctor = db.query(Doctor).filter(Doctor.user_id == doctor_user.id).first()
        if not doctor:
            return False
        contacts = db.query(FamilyContact).filter(FamilyContact.user_id == family_user.id).all()
        for fc in contacts:
            patient = db.query(Patient).filter(Patient.id == fc.patient_id).first()
            if patient and patient.assigned_doctor_id == doctor.id:
                return True
        return False

    # Same-role pairs (patient↔patient, doctor↔doctor, …) are not allowed
    return False


def _display_name_for(viewer: User, partner: User, db: Session) -> str:
    """A family member is shown by the name their patient/doctor registered for
    them (FamilyContact.name) — not their self-chosen account name."""
    if partner.role == UserRole.FAMILY:
        if viewer.role == UserRole.PATIENT:
            vp = db.query(Patient).filter(Patient.user_id == viewer.id).first()
            if vp:
                fc = db.query(FamilyContact).filter(
                    FamilyContact.user_id == partner.id,
                    FamilyContact.patient_id == vp.id,
                ).first()
                if fc and fc.name:
                    return fc.name
        elif viewer.role == UserRole.DOCTOR:
            vd = db.query(Doctor).filter(Doctor.user_id == viewer.id).first()
            if vd:
                fc = (
                    db.query(FamilyContact)
                    .join(Patient, Patient.id == FamilyContact.patient_id)
                    .filter(
                        FamilyContact.user_id == partner.id,
                        Patient.assigned_doctor_id == vd.id,
                    )
                    .first()
                )
                if fc and fc.name:
                    return fc.name
    return partner.full_name


@router.post("", response_model=MessageOut)
def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك إرسال رسالة إلى نفسك")

    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="المستلِم غير موجود")
    if not receiver.is_active:
        raise HTTPException(status_code=403, detail="هذا الحساب غير نشط")

    if not _care_relationship_exists(current_user, receiver, db):
        raise HTTPException(
            status_code=403,
            detail="لا يمكنك مراسلة هذا المستخدم — لا توجد علاقة رعاية بينكما",
        )

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _build_out(msg, current_user, receiver)


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return one entry per unique conversation partner."""
    messages = (
        db.query(Message)
        .filter(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            )
        )
        .order_by(Message.created_at.desc())
        .all()
    )

    seen_partners: set[int] = set()
    conversations: list[ConversationOut] = []

    for msg in messages:
        partner_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if partner_id in seen_partners:
            continue
        seen_partners.add(partner_id)

        partner = db.query(User).filter(User.id == partner_id).first()
        unread = (
            db.query(Message)
            .filter(
                Message.sender_id == partner_id,
                Message.receiver_id == current_user.id,
                Message.is_read == False,
            )
            .count()
        )
        conversations.append(
            ConversationOut(
                partner_id=partner_id,
                partner_name=_display_name_for(current_user, partner, db) if partner else "",
                last_message=msg.content,
                last_at=msg.created_at,
                unread_count=unread,
            )
        )

    return conversations


@router.get("/with/{partner_id}", response_model=List[MessageOut])
def get_conversation(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
                and_(Message.sender_id == partner_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    # Mark incoming as read
    for m in messages:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()

    return [
        _build_out(m, db.get(User, m.sender_id), db.get(User, m.receiver_id))
        for m in messages
    ]


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Message)
        .filter(Message.receiver_id == current_user.id, Message.is_read == False)
        .count()
    )
    return {"unread_count": count}


@router.get("/contacts")
def messageable_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the users the current user is allowed to start a conversation with —
    so no one has to know or type another user's numeric ID. Each contact also
    carries a *context* (the related patient) so a doctor/family with several
    patients can tell which family/doctor belongs to which patient."""
    found: dict[int, dict] = {}   # user_id -> {"user": User, "contexts": set[str]}

    def add(u: User | None, context: str | None = None) -> None:
        if u and u.id != current_user.id and u.is_active:
            entry = found.setdefault(u.id, {"user": u, "contexts": set()})
            if context:
                entry["contexts"].add(context)

    def patient_name(p: Patient) -> str:
        pu = db.query(User).filter(User.id == p.user_id).first()
        return pu.full_name if pu else "—"

    role = current_user.role

    if role == UserRole.ADMIN:
        for u in db.query(User).filter(User.is_active == True).all():
            add(u)
        # Tag family accounts with the patient(s) they care for
        for entry in found.values():
            if entry["user"].role == UserRole.FAMILY:
                for fc in db.query(FamilyContact).filter(FamilyContact.user_id == entry["user"].id).all():
                    p = db.query(Patient).filter(Patient.id == fc.patient_id).first()
                    if p:
                        entry["contexts"].add(patient_name(p))
    else:
        # Every role can reach an admin (support channel)
        for a in db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).all():
            add(a)

        if role == UserRole.PATIENT:
            patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
            if patient:
                if patient.assigned_doctor_id:
                    doc = db.query(Doctor).filter(Doctor.id == patient.assigned_doctor_id).first()
                    if doc:
                        add(db.query(User).filter(User.id == doc.user_id).first())
                for fc in db.query(FamilyContact).filter(
                    FamilyContact.patient_id == patient.id, FamilyContact.user_id.isnot(None)
                ).all():
                    add(db.query(User).filter(User.id == fc.user_id).first())

        elif role == UserRole.DOCTOR:
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
            if doctor:
                for p in db.query(Patient).filter(Patient.assigned_doctor_id == doctor.id).all():
                    pname = patient_name(p)
                    add(db.query(User).filter(User.id == p.user_id).first())
                    # Each family member is shown with the patient they care for
                    for fc in db.query(FamilyContact).filter(
                        FamilyContact.patient_id == p.id, FamilyContact.user_id.isnot(None)
                    ).all():
                        add(db.query(User).filter(User.id == fc.user_id).first(), context=pname)

        elif role == UserRole.FAMILY:
            for fc in db.query(FamilyContact).filter(FamilyContact.user_id == current_user.id).all():
                patient = db.query(Patient).filter(Patient.id == fc.patient_id).first()
                if patient:
                    pname = patient_name(patient)
                    add(db.query(User).filter(User.id == patient.user_id).first())
                    # Each doctor is shown with the patient they treat
                    if patient.assigned_doctor_id:
                        doc = db.query(Doctor).filter(Doctor.id == patient.assigned_doctor_id).first()
                        if doc:
                            add(db.query(User).filter(User.id == doc.user_id).first(), context=pname)

    role_ar = {"patient": "مريض", "doctor": "طبيب", "family": "مقدّم رعاية", "admin": "الإدارة"}
    return [
        {
            "id": e["user"].id,
            "full_name": _display_name_for(current_user, e["user"], db),
            "role": e["user"].role.value,
            "role_label": role_ar.get(e["user"].role.value, e["user"].role.value),
            "context": " · ".join(sorted(e["contexts"])) if e["contexts"] else None,
        }
        for e in sorted(found.values(), key=lambda x: x["user"].full_name or "")
    ]


def _build_out(msg: Message, sender: User, receiver: User) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        content=msg.content,
        is_read=msg.is_read,
        sender_name=sender.full_name if sender else "",
        receiver_name=receiver.full_name if receiver else "",
        created_at=msg.created_at,
    )
