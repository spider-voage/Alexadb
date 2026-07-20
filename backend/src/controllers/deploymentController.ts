import { Request, Response, NextFunction } from 'express';
import { DeploymentService } from '../services/deploymentService';
import { AuthRequest } from '../middleware/auth';

export const createDeployment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deployment = await DeploymentService.createDeployment(req.user!.id, req.params.id, req.body);
    res.status(201).json({ deployment });
  } catch (error) { next(error); }
};

export const getDeployments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deployments = await DeploymentService.getDeployments(req.user!.id, req.params.id);
    res.json({ deployments });
  } catch (error) { next(error); }
};

export const getDeployment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deployment = await DeploymentService.getDeployment(req.user!.id, req.params.id, req.params.deploymentId);
    res.json({ deployment });
  } catch (error) { next(error); }
};

export const getBuildLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await DeploymentService.getBuildLog(req.user!.id, req.params.id, req.params.deploymentId);
    res.json(log);
  } catch (error) { next(error); }
};

export const rollback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deployment = await DeploymentService.rollback(req.user!.id, req.params.id, req.params.deploymentId);
    res.json({ deployment });
  } catch (error) { next(error); }
};

export const redeploy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deployment = await DeploymentService.redeploy(req.user!.id, req.params.id, req.params.deploymentId);
    res.json({ deployment });
  } catch (error) { next(error); }
};
