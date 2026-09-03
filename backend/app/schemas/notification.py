from pydantic import BaseModel
from typing import Optional


class NotificationOut(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    message: str
    transactionId: Optional[str] = None
    isRead: bool
    createdAt: str

    model_config = {"from_attributes": True}


class UnreadCountOut(BaseModel):
    count: int
