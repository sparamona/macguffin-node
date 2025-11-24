# Build stage for React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
COPY server/ ./server/
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server files (includes init_db.sql and built frontend at dist/)
COPY server/package*.json ./
RUN npm ci --production

COPY server/ ./

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/macguffin.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

