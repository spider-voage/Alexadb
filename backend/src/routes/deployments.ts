import { Router } from 'express';
import * as deploymentController from '../controllers/deploymentController';
import { authenticate } from '../middleware/auth';
import { deployLimiter } from '../middleware/rateLimiter';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', deployLimiter, deploymentController.createDeployment);
router.get('/', deploymentController.getDeployments);
router.get('/:deploymentId', deploymentController.getDeployment);
router.get('/:deploymentId/logs', deploymentController.getBuildLog);
router.post('/:deploymentId/rollback', deploymentController.rollback);
router.post('/:deploymentId/redeploy', deployLimiter, deploymentController.redeploy);

export default router;
