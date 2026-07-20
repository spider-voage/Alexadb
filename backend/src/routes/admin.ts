import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/activate', adminController.activateUser);
router.patch('/users/:id/plan', adminController.upgradeUserPlan);

// Projects
router.get('/projects', adminController.getAllProjects);
router.delete('/projects/:id', adminController.deleteProjectAsAdmin);

// Deployments
router.get('/deployments', adminController.getAllDeployments);

// Notifications
router.post('/broadcast', adminController.broadcastNotification);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Dashboard
router.get('/metrics', adminController.getDashboardMetrics);

// Coupons
router.post('/coupons', adminController.manageCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

export default router;
