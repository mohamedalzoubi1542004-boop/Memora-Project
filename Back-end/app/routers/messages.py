"""Messages router — send, read, conversations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.schemas.message_schema import MessageCreate, MessageOut, ConversationOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageOut)
def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

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
                partner_name=partner.full_name if partner else "",
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
        raise HTTPException(status_code=404, detail="User not found")

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
