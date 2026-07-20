import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateVerificationToken,
  encryptEnvVar
} from '../utils/helpers';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  static async register(email: string, password: string, name?: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
      }
    });

    // Store verification token in Redis (24h expiry)
    await redis.setex(`verify:${verificationToken}`, 86400, user.id);

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    return { user: { id: user.id, email: user.email, name: user.name }, message: 'Verification email sent' };
  }

  static async verifyEmail(token: string) {
    const userId = await redis.get(`verify:${token}`);
    if (!userId) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() }
    });

    await redis.del(`verify:${token}`);
    return { message: 'Email verified successfully' };
  }

  static async login(email: string, password: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Account suspended', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // If 2FA is enabled, return temp token
    if (user.twoFactorEnabled) {
      const tempToken = generateToken(user.id, 'access');
      await redis.setex(`2fa:${tempToken}`, 600, user.id);
      return { requires2FA: true, tempToken };
    }

    const accessToken = generateToken(user.id, 'access');
    const refreshToken = generateToken(user.id, 'refresh');

    // Store refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        type: 'REFRESH',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
      },
      accessToken,
      refreshToken,
    };
  }

  static async verify2FA(tempToken: string, code: string) {
    const userId = await redis.get(`2fa:${tempToken}`);
    if (!userId) {
      throw new AppError('Invalid or expired session', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new AppError('2FA not configured', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new AppError('Invalid 2FA code', 401);
    }

    await redis.del(`2fa:${tempToken}`);

    const accessToken = generateToken(user.id, 'access');
    const refreshToken = generateToken(user.id, 'refresh');

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        type: 'REFRESH',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
      },
      accessToken,
      refreshToken,
    };
  }

  static async setup2FA(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const secret = speakeasy.generateSecret({
      name: `AlexaDB (${user.email})`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 }
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  static async enable2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new AppError('2FA not configured', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new AppError('Invalid verification code', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    return { message: '2FA enabled successfully' };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If an account exists, a reset email has been sent' };
    }

    const resetToken = generateVerificationToken();
    await redis.setex(`reset:${resetToken}`, 3600, user.id);

    await sendPasswordResetEmail(email, resetToken);
    return { message: 'If an account exists, a reset email has been sent' };
  }

  static async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(`reset:${token}`);
    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await redis.del(`reset:${token}`);

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId } });

    return { message: 'Password reset successfully' };
  }

  static async refreshToken(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const accessToken = generateToken(session.userId, 'access');
    return { accessToken };
  }

  static async logout(userId: string, token: string) {
    await prisma.session.deleteMany({
      where: { userId, token }
    });

    // Blacklist token
    await redis.setex(`bl:${token}`, 900, '1');

    return { message: 'Logged out successfully' };
  }

  static async logoutAll(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
    return { message: 'All sessions logged out' };
  }

  static async updateProfile(userId: string, data: { name?: string; avatar?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        plan: true,
      }
    });
    return user;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new AppError('User not found', 404);
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Logout all sessions
    await prisma.session.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully' };
  }
}
