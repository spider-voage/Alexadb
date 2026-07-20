import { Router } from 'express';
import * as domainController from '../controllers/domainController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', domainController.getDomains);
router.post('/', domainController.addDomain);
router.delete('/:domainId', domainController.deleteDomain);
router.patch('/:domainId/dns', domainController.updateDNS);
router.patch('/:domainId/redirects', domainController.updateRedirects);

export default router;
