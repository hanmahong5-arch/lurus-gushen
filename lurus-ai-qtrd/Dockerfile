# AI-QTRD FastAPI Backend Dockerfile
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install TA-Lib from source (required by vnpy)
RUN wget -q https://github.com/TA-Lib/ta-lib/releases/download/v0.6.4/ta-lib-0.6.4-src.tar.gz && \
    tar -xzf ta-lib-0.6.4-src.tar.gz && \
    cd ta-lib-0.6.4 && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib-0.6.4 ta-lib-0.6.4-src.tar.gz

# Copy requirements first for better caching
COPY vnpy_ai_trader/requirements.txt /build/requirements.txt

# Create wheels for all dependencies
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels \
    -r /build/requirements.txt

# ============================================
# Stage 2: Runtime
# ============================================
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash trader && \
    mkdir -p /app/data /app/logs && \
    chown -R trader:trader /app

# Install runtime dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy TA-Lib shared libraries from builder stage
COPY --from=builder /usr/lib/libta_lib* /usr/lib/
COPY --from=builder /usr/include/ta-lib /usr/include/ta-lib

# Update library cache
RUN ldconfig

# Copy and install Python wheels
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && \
    rm -rf /wheels

# Copy vnpy source code (project includes vnpy as source)
COPY --chown=trader:trader vnpy /app/vnpy

# Copy application code
COPY --chown=trader:trader vnpy_ai_trader/src /app/src
COPY --chown=trader:trader vnpy_ai_trader/config /app/config
COPY --chown=trader:trader vnpy_ai_trader/scripts /app/scripts

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    WEB_HOST=0.0.0.0 \
    WEB_PORT=8000 \
    LOG_LEVEL=info

# Switch to non-root user
USER trader

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${WEB_PORT}/health || exit 1

# Expose port
EXPOSE 8000

# Start the application
CMD ["python", "-m", "uvicorn", "src.web.app:app", "--host", "0.0.0.0", "--port", "8000"]
