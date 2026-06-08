FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Only copy package files first for better caching
COPY package*.json ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Note: npm install will be run via docker-compose volumes
# This allows node_modules to be visible on host machine

# Start in development mode
CMD ["sh", "-c", "npm install && npm run start:dev"]