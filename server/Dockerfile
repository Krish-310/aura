FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
COPY app /app/app
ENV PORT=8787
EXPOSE 8787
CMD ["bash", "/app/uvicorn.run.sh"]
