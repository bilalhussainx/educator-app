# =================================================================
# FILE: Dockerfile (Free Tier with pm2 Process Manager)
# =================================================================
# DESCRIPTION: Single service running both server and worker with pm2

# Use the official Node.js 18 image
FROM node:18-bullseye

WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching
COPY educators-edge-backend/package*.json ./

# Install dependencies, including pm2 globally
RUN npm install
RUN npm install pm2 -g

# Copy your application code
COPY educators-edge-backend/ ./

# Copy the pm2 config file into the container
COPY ecosystem.config.js /usr/src/app/

# Expose the port your Express app listens on
EXPOSE 10000

# Health check to verify the server is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:10000/healthz || exit 1

# The command to start both processes using pm2
CMD [ "pm2-runtime", "start", "/usr/src/app/ecosystem.config.js" ]