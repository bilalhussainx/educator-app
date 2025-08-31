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
FROM node:18-bullseye AS app-builder

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

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d && \
    echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:dockerd]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=dockerd --host=unix:///var/run/docker.sock' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/dockerd.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/dockerd.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:app]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=node server.js' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/usr/src/app' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/app.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/app.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=NODE_ENV=production,PORT=10000' >> /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 10000

# Use supervisor to run both Docker daemon and Node.js app
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]