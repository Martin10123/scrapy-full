from datetime import datetime

from pydantic import BaseModel


class JobOut(BaseModel):
    id: int
    source: str
    title: str
    company: str | None
    city: str | None
    remote_type: str | None
    salary_min: int | None
    salary_max: int | None
    category: str | None
    seniority: str | None
    skills: list[str]
    url: str
    is_active: bool
    published_at: datetime | None
    scraped_at: datetime

    model_config = {"from_attributes": True}


class TopSkill(BaseModel):
    skill: str
    count: int
