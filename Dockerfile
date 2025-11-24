# Build stage for React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /build
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN BUILD_FOR_DOCKER=1 npm run build
# Build outputs to /build/dist

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --production

# Copy server files
COPY server/ ./

# Copy built frontend from build stage
COPY --from=frontend-build /build/dist ./dist

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/macguffin.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

