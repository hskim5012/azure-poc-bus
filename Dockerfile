FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Set standard Node.js environment variables
ENV NODE_ENV=production

# Run the worker script by default (non-interactive)
CMD ["npm", "run", "start:worker"]
