# =================================================================
# FILE: Dockerfile (Production with Docker-in-Docker Support)
# =================================================================
# DESCRIPTION: Multi-stage Docker build for production deployment
# with Docker-in-Docker capabilities for code execution

# Stage 1: Base image with Docker support
FROM docker:24-dind AS docker-base

# Install Node.js and other dependencies
RUN apk add --no-cache nodejs npm python3 py3-pip openjdk17-jdk bash curl

# Stage 2: Application build
FROM node:20-bullseye AS app-builder

# Set environment variable to prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install Docker CLI only (we'll use DinD from base)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/* get-docker.sh

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Stage 3: Final production image
FROM docker:24-dind

# Install Node.js and other runtimes
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    py3-pip \
    openjdk17-jdk \
    bash \
    curl \
    supervisor

# Create app directory
WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=app-builder /usr/src/app .

# Create log directories
RUN mkdir -p /var/log /var/run && \
    chmod 755 /var/log /var/run

# Create supervisor configuration with better error handling
RUN mkdir -p /etc/supervisor/conf.d && \
    echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'loglevel=info' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'logfile=/var/log/supervisord.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'pidfile=/var/run/supervisord.pid' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:dockerd]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=dockerd --host=unix:///var/run/docker.sock --log-level=error' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=unexpected' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'startretries=5' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'startsecs=10' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/dockerd.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/dockerd.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=10MB' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=10MB' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'priority=100' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:app]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/bin/sh -c "sleep 15 && node server.js"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/usr/src/app' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=unexpected' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'startretries=3' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'startsecs=5' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/app.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/app.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=10MB' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=10MB' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=NODE_ENV=production,PORT=10000,DOCKER_HOST=unix:///var/run/docker.sock' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'priority=200' >> /etc/supervisor/conf.d/supervisord.conf

# Create startup script
RUN echo '#!/bin/sh' > /usr/local/bin/startup.sh && \
    echo 'echo "Starting Docker-in-Docker environment..."' >> /usr/local/bin/startup.sh && \
    echo 'echo "Checking Docker socket permissions..."' >> /usr/local/bin/startup.sh && \
    echo 'ls -la /var/run/ || true' >> /usr/local/bin/startup.sh && \
    echo 'echo "Starting supervisor..."' >> /usr/local/bin/startup.sh && \
    echo 'exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf' >> /usr/local/bin/startup.sh && \
    chmod +x /usr/local/bin/startup.sh

# Expose port
EXPOSE 10000

# Health check to verify both Node.js app and Docker daemon are running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:10000/healthz && curl -f http://localhost:10000/api/terminal/health || exit 1

# Use startup script
CMD ["/usr/local/bin/startup.sh"]