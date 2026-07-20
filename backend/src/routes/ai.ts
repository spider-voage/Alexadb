import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/analyze-error', aiController.analyzeBuildError);
router.post('/optimize', aiController.optimizeDeployment);
router.post('/detect-issues', aiController.detectConfigIssues);
router.post('/chat', aiController.chatAssistant);

export default router;
