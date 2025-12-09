# --- Build Stage ---
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy all source code
COPY . .

# Build the app (creates the /dist folder)
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies (smaller image)
RUN npm ci --only=production

# Cloud Run injects the PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Start the app
CMD ["node", "dist/main"]