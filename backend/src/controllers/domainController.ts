import { Request, Response, NextFunction } from 'express';
import { DomainService } from '../services/domainService';
import { AuthRequest } from '../middleware/auth';

export const getDomains = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const domains = await DomainService.getDomains(req.user!.id, req.params.id);
    res.json({ domains });
  } catch (error) { next(error); }
};

export const addDomain = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const domain = await DomainService.addDomain(req.user!.id, req.params.id, name);
    res.status(201).json({ domain });
  } catch (error) { next(error); }
};

export const deleteDomain = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await DomainService.deleteDomain(req.user!.id, req.params.id, req.params.domainId);
    res.json(result);
  } catch (error) { next(error); }
};

export const updateDNS = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { dnsRecords } = req.body;
    const domain = await DomainService.updateDNS(req.user!.id, req.params.id, req.params.domainId, dnsRecords);
    res.json({ domain });
  } catch (error) { next(error); }
};

export const updateRedirects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { redirects } = req.body;
    const domain = await DomainService.updateRedirects(req.user!.id, req.params.id, req.params.domainId, redirects);
    res.json({ domain });
  } catch (error) { next(error); }
};
