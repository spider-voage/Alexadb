import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class AnalyticsService {
  static async getProjectAnalytics(userId: string, projectId: string, period: 'day' | 'week' | 'month' = 'week') {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const analytics = await prisma.analytics.findMany({
      where: {
        projectId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    const totals = analytics.reduce((acc, curr) => ({
      visitors: acc.visitors + curr.visitors,
      requests: acc.requests + curr.requests,
      bandwidth: acc.bandwidth + Number(curr.bandwidth),
      cpuUsage: acc.cpuUsage + curr.cpuUsage,
      ramUsage: acc.ramUsage + curr.ramUsage,
      buildTime: acc.buildTime + curr.buildTime,
      errorRate: acc.errorRate + curr.errorRate,
    }), { visitors: 0, requests: 0, bandwidth: 0, cpuUsage: 0, ramUsage: 0, buildTime: 0, errorRate: 0 });

    const count = analytics.length || 1;

    return {
      data: analytics,
      summary: {
        totalVisitors: totals.visitors,
        totalRequests: totals.requests,
        totalBandwidth: totals.bandwidth,
        avgCpuUsage: (totals.cpuUsage / count).toFixed(2),
        avgRamUsage: (totals.ramUsage / count).toFixed(2),
        avgBuildTime: Math.round(totals.buildTime / count),
        avgErrorRate: (totals.errorRate / count).toFixed(2),
      }
    };
  }

  static async recordMetrics(projectId: string, metrics: {
    visitors?: number;
    requests?: number;
    bandwidth?: number;
    cpuUsage?: number;
    ramUsage?: number;
    buildTime?: number;
    errorRate?: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analytics.upsert({
      where: {
        projectId_date: { projectId, date: today }
      },
      update: {
        visitors: { increment: metrics.visitors || 0 },
        requests: { increment: metrics.requests || 0 },
        bandwidth: { increment: metrics.bandwidth || 0 },
        cpuUsage: metrics.cpuUsage || 0,
        ramUsage: metrics.ramUsage || 0,
        buildTime: metrics.buildTime || 0,
        errorRate: metrics.errorRate || 0,
      },
      create: {
        projectId,
        date: today,
        ...metrics,
      }
    });
  }

  static async getDashboardStats(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: { deployments: true, domains: true }
        }
      }
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'DEPLOYED').length;
    const totalDeployments = projects.reduce((sum, p) => sum + p._count.deployments, 0);
    const totalDomains = projects.reduce((sum, p) => sum + p._count.domains, 0);
    const totalStorage = projects.reduce((sum, p) => sum + Number(p.storageUsed), 0);
    const totalBandwidth = projects.reduce((sum, p) => sum + Number(p.bandwidthUsed), 0);

    // Get recent activity
    const recentDeployments = await prisma.deployment.findMany({
      where: { project: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } }
    });

    const unreadNotifications = await prisma.notification.count({
      where: { userId, read: false }
    });

    return {
      totalProjects,
      activeProjects,
      remainingSlots: Math.max(0, 5 - totalProjects), // Based on plan
      totalDeployments,
      totalDomains,
      totalStorage,
      totalBandwidth,
      recentDeployments,
      unreadNotifications,
    };
  }
}
