# Smart Contracts Development Environment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data

# Expose Hardhat network port
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8545', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start Hardhat network
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
