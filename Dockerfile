FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install chromium

COPY src ./src
COPY .env ./.env

ENV PYTHONPATH=/app/src

CMD ["uvicorn", "jobtrend_ai.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
