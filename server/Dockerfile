FROM python:3.11-slim

# Install system dependencies including SQLite for ChromaDB
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for the enhanced functionality
RUN pip install --no-cache-dir sentence-transformers

# Copy application code
COPY . .

# Create ChromaDB data directory and ~/.aura directory for repositories
RUN mkdir -p /app/.chroma && \
    chmod 755 /app/.chroma && \
    mkdir -p /root/.aura && \
    chmod 755 /root/.aura

# Set environment variables for ChromaDB
ENV CHROMA_PATH=/app/.chroma
ENV EMBED_MODEL=mixedbread-ai/mxbai-embed-large-v1
ENV TOP_K=8

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/status?repo=test&prNumber=1&commit=main || exit 1

# Run the application
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8787"]