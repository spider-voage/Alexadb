import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/stats', projectController.getProjectStats);

// Environment Variables
router.get('/:id/env', projectController.getEnvVars);
router.post('/:id/env', projectController.addEnvVar);
router.delete('/:id/env/:envId', projectController.deleteEnvVar);

// Files
router.get('/:id/files', projectController.getFiles);
router.post('/:id/files', projectController.createFile);
router.delete('/:id/files/:fileId', projectController.deleteFile);

export default router;
