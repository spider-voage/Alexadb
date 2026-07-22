FROM node:20-alpine

WORKDIR /app

# Copy and install backend deps
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend prisma and generate
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy backend source and build
COPY backend/. .
RUN npm run build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/. .
RUN npm run build

# Move built frontend to backend dist
RUN mkdir -p /app/dist/public && cp -r /app/frontend/dist/* /app/dist/public/

# Back to backend
WORKDIR /app

EXPOSE 5000

CMD npx prisma migrate deploy && node dist/index.js
