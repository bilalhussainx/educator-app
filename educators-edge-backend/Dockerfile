# Dockerfile for CoreZenith - The Ultimate Multi-Language Environment

# 1. Base Image
# We start from a full Debian "bullseye" image to ensure all package managers
# and build tools are available and compatible.
FROM node:18-bullseye

# 2. Set environment variable to prevent interactive prompts during installation.
ENV DEBIAN_FRONTEND=noninteractive

# 3. Install all necessary language runtimes and compilers in a single, optimized layer.
#    - build-essential: Provides tools like 'make' and 'g++' needed to compile some software.
#    - python3 & python3-pip: For Python 3.
#    - openjdk-17-jdk: A modern, stable Java Development Kit for compiling and running .java files.
#    - ruby-full: The complete Ruby programming language interpreter.
#    - golang-go: The Go programming language toolchain.
#    - We clean up the apt cache at the end to significantly reduce the final image size.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    ruby-full \
    golang-go \
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
#    This always starts your main Node.js server.
CMD [ "node", "server.js" ]