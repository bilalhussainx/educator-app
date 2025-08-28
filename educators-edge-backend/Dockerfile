# Dockerfile for CoreZenith - Definitive Multi-Language Environment

# 1. Base Image
# Use a full Debian "bullseye" image. It is stable and has a reliable package manager.
FROM node:18-bullseye

# 2. Set environment variable to prevent interactive prompts during installation.
ENV DEBIAN_FRONTEND=noninteractive

# 3. Install necessary language runtimes and compilers in a single, optimized layer.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 4. Set the working directory for our application.
WORKDIR /usr/src/app

# 5. Copy package files for optimized Node.js dependency installation.
COPY package*.json ./

# 6. Install ONLY production Node.js dependencies.
RUN npm install --only=production

# 7. Copy the rest of your application's source code.
COPY . .

# 8. Expose the port that the application will run on.
EXPOSE 10000

# 9. Define the command to run your application when the container starts.
#    This starts your main Node.js server. For the worker, Render will override this.
CMD [ "node", "server.js" ]