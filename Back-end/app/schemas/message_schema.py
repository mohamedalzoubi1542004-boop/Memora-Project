from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class MessageCreate(BaseModel):
    receiver_id: int
    content: str = Field(..., min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def _content_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("لا يمكن إرسال رسالة فارغة")
        return stripped


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
