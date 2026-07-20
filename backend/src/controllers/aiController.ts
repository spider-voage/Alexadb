import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/aiService';
import { AuthRequest } from '../middleware/auth';

export const analyzeBuildError = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { errorLog } = req.body;
    const result = await AIService.analyzeBuildError(errorLog);
    res.json(result);
  } catch (error) { next(error); }
};

export const optimizeDeployment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AIService.optimizeDeployment(req.body);
    res.json(result);
  } catch (error) { next(error); }
};

export const detectConfigIssues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AIService.detectConfigIssues(req.body);
    res.json(result);
  } catch (error) { next(error); }
};

export const chatAssistant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message, context } = req.body;
    const response = await AIService.chatAssistant(message, context);
    res.json({ response });
  } catch (error) { next(error); }
};
