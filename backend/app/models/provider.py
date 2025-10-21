import uuid
from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Time, SmallInteger, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Establishment(Base):
    __tablename__ = "establishments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

class Provider(Base):
    __tablename__ = "providers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    establishment_id = Column(UUID(as_uuid=True), ForeignKey("establishments.id"), nullable=True)
    display_name = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

class ProviderWorkHours(Base):
    __tablename__ = "provider_work_hours"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("providers.id"), nullable=False)
    weekday = Column(SmallInteger, nullable=False)  # 0..6
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    __table_args__ = (UniqueConstraint("provider_id","weekday","start_time","end_time", name="uq_work_hours_block"),)
