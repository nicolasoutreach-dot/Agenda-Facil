from sqlalchemy import Column, Text, TIMESTAMP, text, SmallInteger, CheckConstraint, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

class NotificationMessage(Base):
    __tablename__ = "notification_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    channel = Column(Text, nullable=False)   # 'whatsapp'|'sms'
    recipient = Column(Text, nullable=False)
    template = Column(Text, nullable=False)
    variables = Column(JSONB, nullable=True)
    status = Column(Text, nullable=False)    # 'QUEUED'|'SENT'|'FAILED'
    attempts = Column(SmallInteger, nullable=False, server_default=text("0"))
    last_error = Column(Text, nullable=True)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    sent_at = Column(TIMESTAMP(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint("status in ('QUEUED','SENT','FAILED')", name='notification_status_chk'),
    )
