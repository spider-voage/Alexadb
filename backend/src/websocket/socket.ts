import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';

export const setupWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      // Verify JWT token
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`User ${userId} connected via WebSocket`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Listen for build log subscriptions
    socket.on('subscribe:build', (projectId: string) => {
      socket.join(`build:${projectId}`);
      logger.info(`User ${userId} subscribed to build logs for ${projectId}`);
    });

    socket.on('unsubscribe:build', (projectId: string) => {
      socket.leave(`build:${projectId}`);
    });

    // Listen for deployment events
    socket.on('subscribe:deployments', (projectId: string) => {
      socket.join(`deployments:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected`);
    });
  });

  return io;
};

// Helper to emit build logs
export const emitBuildLog = (io: SocketIOServer, projectId: string, log: string) => {
  io.to(`build:${projectId}`).emit('build:log', { projectId, log });
};

export const emitDeploymentUpdate = (io: SocketIOServer, projectId: string, deployment: any) => {
  io.to(`deployments:${projectId}`).emit('deployment:update', { projectId, deployment });
};

export const emitNotification = (io: SocketIOServer, userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};
