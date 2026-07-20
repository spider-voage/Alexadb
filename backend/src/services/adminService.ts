import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Plan } from '@prisma/client';

export class AdminService {
  static async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as any } },
        { name: { contains: search, mode: 'insensitive' as any } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          status: true,
          plan: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { projects: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          include: {
            _count: { select: { deployments: true, domains: true } }
          }
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      }
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async suspendUser(userId: string, reason?: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' }
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId } });

    return { message: 'User suspended', reason };
  }

  static async activateUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' }
    });
    return { message: 'User activated' };
  }

  static async upgradeUserPlan(userId: string, plan: Plan) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });
    return { message: `User plan upgraded to ${plan}` };
  }

  static async getAllProjects(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { deployments: true, domains: true } }
        }
      }),
      prisma.project.count()
    ]);

    return { projects, total, page, pages: Math.ceil(total / limit) };
  }

  static async deleteProjectAsAdmin(projectId: string) {
    await prisma.project.delete({ where: { id: projectId } });
    return { message: 'Project deleted' };
  }

  static async getAllDeployments(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { name: true, user: { select: { email: true } } } }
        }
      }),
      prisma.deployment.count()
    ]);

    return { deployments, total, page, pages: Math.ceil(total / limit) };
  }

  static async broadcastNotification(title: string, message: string, type: string = 'INFO') {
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });

    const notifications = users.map(user => ({
      userId: user.id,
      title,
      message,
      type: type as any,
    }));

    await prisma.notification.createMany({ data: notifications });

    return { message: `Notification sent to ${users.length} users` };
  }

  static async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } }
        }
      }),
      prisma.auditLog.count()
    ]);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  static async getDashboardMetrics() {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalDeployments,
      totalPayments,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.project.count(),
      prisma.deployment.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      }),
    ]);

    const revenue = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });

    return {
      totalUsers,
      activeUsers,
      totalProjects,
      totalDeployments,
      totalPayments,
      recentSignups,
      totalRevenue: revenue._sum.amount || 0,
    };
  }

  static async manageCoupon(data: {
    code: string;
    description?: string;
    discount: number;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    return prisma.coupon.create({ data });
  }

  static async deleteCoupon(couponId: string) {
    await prisma.coupon.delete({ where: { id: couponId } });
    return { message: 'Coupon deleted' };
  }
}
