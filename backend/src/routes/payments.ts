import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/plans', paymentController.getPlans);

router.use(authenticate);

router.post('/intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/history', paymentController.getPaymentHistory);
router.post('/coupon', paymentController.applyCoupon);

export default router;
