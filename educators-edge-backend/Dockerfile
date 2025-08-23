# Start from an official Node.js image (which is based on Debian).
# This is more efficient as it already includes Node.js and its package manager.
FROM node:18-bullseye

# Set an environment variable to prevent interactive prompts during package installation.
ENV DEBIAN_FRONTEND=noninteractive

# Combine all installation commands into a single RUN instruction.
# This reduces the number of layers in the image and can speed up the build.
# - We use --no-install-recommends to avoid installing unnecessary packages.
# - We clean up the apt cache at the end to reduce the final image size.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set a working directory inside the container.
WORKDIR /app

# When the container starts, it will run a bash shell by default,
# which is what we need for executing code.
CMD ["/bin/bash"]



# # =================================================================
# # FOLDER: educators-edge-backend/
# # FILE:   Dockerfile
# # =================================================================
# # DESCRIPTION: This file defines the secure, isolated environment where
# # user code will be executed. It starts from a basic Node.js image
# # and then installs Python and other necessary tools.

# # Use an official Node.js image as the base.
# # Using a specific version ensures a consistent environment.
# FROM node:18-slim

# # Set the working directory inside the container.
# WORKDIR /usr/src/app

# # Update the package lists and install Python, pip, and git.
# # `-y` answers yes to any prompts.
# # `&& rm -rf /var/lib/apt/lists/*` cleans up the cache to keep the image small.
# RUN apt-get update && \
#     apt-get install -y python3 python3-pip git && \
#     rm -rf /var/lib/apt/lists/*

# # (Optional) You could pre-install common packages here to speed up execution later.
# # For example:
# # RUN pip3 install numpy pandas
# # RUN npm install -g nodemon

# # A basic command to run when the container starts.
# # This will be overridden by our application logic, but it's good practice to have a default.
# CMD [ "node" ]
