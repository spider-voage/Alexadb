FROM node:20-slim

# Install build tools for sqlite3 native module
RUN apt-get update && apt-get install -y python3 make g++     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Use npm install (not ci) so it works with or without lockfile
RUN npm install --production

# Copy app files
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data && chmod 755 /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/spiderdb.sqlite

EXPOSE 3000

CMD ["node", "server.js"]
