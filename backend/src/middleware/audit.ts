import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function(body: any) {
      // Log after response is sent
      if (req.user && res.statusCode < 400) {
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId: body?.id || body?.data?.id,
            details: { body: typeof body === 'object' ? { ...body, password: undefined } : body },
            ip: req.ip,
            userAgent: req.get('user-agent'),
          }
        }).catch(console.error);
      }
      return originalJson(body);
    };

    next();
  };
};
