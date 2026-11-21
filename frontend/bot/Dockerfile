# Telegram bot image (presentation tier).
# Build from the frontend/ context (needs main.py + bot/ + utlis/):
#   docker build -f bot/Dockerfile -t lol-ledger-bot:local .
# Or from repo root:
#   docker build -f frontend/bot/Dockerfile -t lol-ledger-bot:local ./frontend

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./
COPY bot ./bot
COPY utlis ./utlis

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin appuser \
  && chown -R appuser:appuser /app
USER appuser

CMD ["python", "main.py"]
