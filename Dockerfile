# Build stage for React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm ci --production

COPY server/ ./
COPY init_db.sql ./

# Copy built frontend from build stage
COPY --from=frontend-build /app/client/dist ./dist

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/macguffin.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

