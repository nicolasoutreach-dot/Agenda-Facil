import uuid
from sqlalchemy import Column, Text, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(Text, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)
