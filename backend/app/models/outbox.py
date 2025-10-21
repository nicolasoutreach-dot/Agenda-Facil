import uuid as _uuid
from sqlalchemy import Column, Text, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

class Outbox(Base):
    __tablename__ = "outbox"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    aggregate_type = Column(Text, nullable=False)
    aggregate_id = Column(UUID(as_uuid=True), nullable=False)
    event_type = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False)
    headers = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    published_at = Column(TIMESTAMP(timezone=True), nullable=True)
