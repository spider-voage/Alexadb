import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';

export const register = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').optional().trim().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError('Validation failed', 400);

      const { email, password, name } = req.body;
      const result = await AuthService.register(email, password, name);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
];

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token) throw new AppError('Token required', 400);
    const result = await AuthService.verifyEmail(token as string);
    res.json(result);
  } catch (error) { next(error); }
};

export const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError('Validation failed', 400);

      const { email, password } = req.body;
      const result = await AuthService.login(email, password, req.ip);
      res.json(result);
    } catch (error) { next(error); }
  }
];

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, code } = req.body;
    const result = await AuthService.verify2FA(tempToken, code);
    res.json(result);
  } catch (error) { next(error); }
};

export const setup2FA = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.setup2FA(req.user!.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const enable2FA = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    const result = await AuthService.enable2FA(req.user!.id, code);
    res.json(result);
  } catch (error) { next(error); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    res.json(result);
  } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    const result = await AuthService.resetPassword(token, password);
    res.json(result);
  } catch (error) { next(error); }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) { next(error); }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    const result = await AuthService.logout(req.user!.id, token);
    res.json(result);
  } catch (error) { next(error); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ user: req.user });
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, avatar } = req.body;
    const result = await AuthService.updateProfile(req.user!.id, { name, avatar });
    res.json(result);
  } catch (error) { next(error); }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) { next(error); }
};
