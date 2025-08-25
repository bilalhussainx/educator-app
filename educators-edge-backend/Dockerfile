# Dockerfile for the MAIN CoreZenith Application Server (Multi-Language)

# 1. Base Image
# We use 'bullseye' instead of 'slim' because it's a full Debian distribution,
# which is more reliable for installing system packages like Python.
FROM node:18-bullseye

# 2. Install Python runtime
#    - apt-get update: Refreshes the package lists.
#    - apt-get install -y python3: Installs the Python 3 interpreter.
#    - We clean up the cache at the end to keep the final image size smaller.
RUN apt-get update && \
    apt-get install -y python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. Set Working Directory
WORKDIR /usr/src/app

# 4. Copy package files for optimized dependency installation
COPY package*.json ./

# 5. Install ONLY production Node.js dependencies
RUN npm install --only=production

# 6. Copy your application's source code
COPY . .

# 7. Expose the port Render will use
EXPOSE 10000

# 8. Define the command to start your Node.js server
CMD [ "node", "server.js" ]