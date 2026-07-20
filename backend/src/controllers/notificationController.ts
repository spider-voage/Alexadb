import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationService.getNotifications(req.user!.id);
    res.json({ notifications });
  } catch (error) { next(error); }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await NotificationService.markAsRead(req.user!.id, req.params.id);
    res.json({ notification });
  } catch (error) { next(error); }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user!.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await NotificationService.deleteNotification(req.user!.id, req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};
