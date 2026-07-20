import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/projectService';
import { AuthRequest } from '../middleware/auth';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await ProjectService.getProjects(req.user!.id);
    res.json({ projects });
  } catch (error) { next(error); }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.getProject(req.user!.id, req.params.id);
    res.json({ project });
  } catch (error) { next(error); }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.createProject(req.user!.id, req.body);
    res.status(201).json({ project });
  } catch (error) { next(error); }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.updateProject(req.user!.id, req.params.id, req.body);
    res.json({ project });
  } catch (error) { next(error); }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ProjectService.deleteProject(req.user!.id, req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const getProjectStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await ProjectService.getProjectStats(req.user!.id, req.params.id);
    res.json({ stats });
  } catch (error) { next(error); }
};

// Environment Variables
export const getEnvVars = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const envVars = await ProjectService.getEnvVars(req.user!.id, req.params.id);
    res.json({ envVars });
  } catch (error) { next(error); }
};

export const addEnvVar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const envVar = await ProjectService.addEnvVar(req.user!.id, req.params.id, key, value);
    res.status(201).json({ envVar });
  } catch (error) { next(error); }
};

export const deleteEnvVar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ProjectService.deleteEnvVar(req.user!.id, req.params.id, req.params.envId);
    res.json(result);
  } catch (error) { next(error); }
};

// Files
export const getFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { path } = req.query;
    const files = await ProjectService.getFiles(req.user!.id, req.params.id, path as string);
    res.json({ files });
  } catch (error) { next(error); }
};

export const createFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = await ProjectService.createFile(req.user!.id, req.params.id, req.body);
    res.status(201).json({ file });
  } catch (error) { next(error); }
};

export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ProjectService.deleteFile(req.user!.id, req.params.id, req.params.fileId);
    res.json(result);
  } catch (error) { next(error); }
};
