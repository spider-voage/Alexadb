import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { AuthRequest } from '../middleware/auth';

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await PaymentService.getPlans();
    res.json({ plans });
  } catch (error) { next(error); }
};

export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan } = req.body;
    const result = await PaymentService.createPaymentIntent(req.user!.id, plan);
    res.json(result);
  } catch (error) { next(error); }
};

export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.body;
    const result = await PaymentService.confirmPayment(req.user!.id, paymentId);
    res.json(result);
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await PaymentService.getPaymentHistory(req.user!.id);
    res.json({ payments });
  } catch (error) { next(error); }
};

export const applyCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    const result = await PaymentService.applyCoupon(req.user!.id, code);
    res.json(result);
  } catch (error) { next(error); }
};
