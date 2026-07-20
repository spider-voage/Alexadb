import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AuthRequest } from '../middleware/auth';

export const getProjectAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const analytics = await AnalyticsService.getProjectAnalytics(
      req.user!.id, 
      req.params.id, 
      period as any
    );
    res.json(analytics);
  } catch (error) { next(error); }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await AnalyticsService.getDashboardStats(req.user!.id);
    res.json(stats);
  } catch (error) { next(error); }
};
