# Dockerfile for the MAIN CoreZenith Application Server

# 1. Base Image
# Use an official Node.js runtime. 'slim' is lightweight and secure.
FROM node:18-slim

# 2. Set Working Directory
WORKDIR /usr/src/app

# 3. Copy package files for optimized dependency installation
COPY package*.json ./

# 4. Install ONLY production dependencies
# This keeps the image small and secure.
RUN npm install --only=production

# 5. Copy your application's source code
# This includes server.js, routes/, controllers/, etc.
COPY . .

# 6. Expose the port Render will use
# Render sets the PORT env variable, often to 10000.
EXPOSE 10000

# 7. Define the command to start your server
# This is the most important step for Render.
CMD [ "node", "server.js" ]