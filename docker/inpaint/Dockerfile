FROM python:3.11-slim

WORKDIR /app

RUN pip install flask opencv-python-headless gunicorn --no-cache-dir -q

COPY server.py .

EXPOSE 8000

CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "1", "--timeout", "120", "server:app"]
