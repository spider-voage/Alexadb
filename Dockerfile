FROM node:20-alpine

WORKDIR /app

# === BACKEND ===
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/. .
RUN npm run build

# === FRONTEND ===
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/. .
RUN npm run build

# === MERGE ===
# Copy built frontend into backend's public folder
RUN mkdir -p /app/backend/dist/public && cp -r /app/frontend/dist/* /app/backend/dist/public/

WORKDIR /app/backend

EXPOSE 5000

CMD npx prisma migrate deploy && node dist/index.js
