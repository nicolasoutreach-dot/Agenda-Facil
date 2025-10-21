import uuid
from sqlalchemy import Column, String, TIMESTAMP, text, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("providers.id"), nullable=False)
    starts_at = Column(TIMESTAMP(timezone=True), nullable=False)
    ends_at = Column(TIMESTAMP(timezone=True), nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

    __table_args__ = (
        CheckConstraint("status in ('PENDING','CONFIRMED','CANCELED')", name="appointment_status_chk"),
    )
