from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class AIChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AIDataBlock(BaseModel):
    type: str
    title: str
    values: Optional[Dict[str, Any]] = None


class AISource(BaseModel):
    title: str
    url: str
    publisher: Optional[str] = None


class AIChatResponse(BaseModel):
    message: str
    intent: Optional[str] = None
    data: Optional[List[AIDataBlock]] = None
    sources: Optional[List[AISource]] = None
    disclaimer: Optional[str] = None


class ConversationOut(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}
