from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    sender_name: str = ""
    receiver_name: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    partner_id: int
    partner_name: str
    last_message: str
    last_at: datetime
    unread_count: int
