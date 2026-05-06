from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from jobtrend_ai.db.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)
    remote_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(5), default="COP")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    seniority: Mapped[str | None] = mapped_column(String(10), nullable=True)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    url: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
