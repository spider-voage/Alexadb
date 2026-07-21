import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Plan } from '@prisma/client';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string, type: 'access' | 'refresh' = 'access'): string => {
  const secret = type === 'access' ? process.env.JWT_SECRET! : process.env.JWT_REFRESH_SECRET!;
  const expiresIn = type === 'access' ? '15m' : '7d';
  return jwt.sign({ userId, type }, secret, { expiresIn });
};

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const encryptEnvVar = (value: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
};

export const decryptEnvVar = (encryptedValue: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + crypto.randomBytes(4).toString('hex');
};

export const getPlanLimits = (plan: Plan) => {
  const limits: Record<Plan, { projects: number; storage: number; bandwidth: number }> = {
    FREE: { projects: 5, storage: 2 * 1024 * 1024 * 1024, bandwidth: 25 * 1024 * 1024 * 1024 },
    STARTER: { projects: 15, storage: 20 * 1024 * 1024 * 1024, bandwidth: 150 * 1024 * 1024 * 1024 },
    PRO: { projects: 50, storage: 100 * 1024 * 1024 * 1024, bandwidth: 1024 * 1024 * 1024 * 1024 },
    BUSINESS: { projects: 150, storage: 500 * 1024 * 1024 * 1024, bandwidth: Infinity },
    ENTERPRISE: { projects: Infinity, storage: Infinity, bandwidth: Infinity },
  };
  return limits[plan] || limits.FREE;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"']/g, '');
};
