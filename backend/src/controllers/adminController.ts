import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService';
import { AuthRequest } from '../middleware/auth';

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search } = req.query;
    const result = await AdminService.getUsers(
      Number(page) || 1,
      Number(limit) || 20,
      search as string
    );
    res.json(result);
  } catch (error) { next(error); }
};

export const getUserDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await AdminService.getUserDetails(req.params.id);
    res.json({ user });
  } catch (error) { next(error); }
};

export const suspendUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.suspendUser(req.params.id, req.body.reason);
    res.json(result);
  } catch (error) { next(error); }
};

export const activateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.activateUser(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const upgradeUserPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan } = req.body;
    const result = await AdminService.upgradeUserPlan(req.params.id, plan);
    res.json(result);
  } catch (error) { next(error); }
};

export const getAllProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await AdminService.getAllProjects(Number(page) || 1, Number(limit) || 20);
    res.json(result);
  } catch (error) { next(error); }
};

export const deleteProjectAsAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.deleteProjectAsAdmin(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const getAllDeployments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await AdminService.getAllDeployments(Number(page) || 1, Number(limit) || 20);
    res.json(result);
  } catch (error) { next(error); }
};

export const broadcastNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, message, type } = req.body;
    const result = await AdminService.broadcastNotification(title, message, type);
    res.json(result);
  } catch (error) { next(error); }
};

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await AdminService.getAuditLogs(Number(page) || 1, Number(limit) || 50);
    res.json(result);
  } catch (error) { next(error); }
};

export const getDashboardMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metrics = await AdminService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) { next(error); }
};

export const manageCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const coupon = await AdminService.manageCoupon(req.body);
    res.status(201).json({ coupon });
  } catch (error) { next(error); }
};

export const deleteCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.deleteCoupon(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};
