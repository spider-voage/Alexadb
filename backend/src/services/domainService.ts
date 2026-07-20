import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPlanLimits } from '../utils/helpers';

export class DomainService {
  static async getDomains(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.domain.findMany({ where: { projectId } });
  }

  static async addDomain(userId: string, projectId: string, name: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { user: true }
    });
    if (!project) throw new AppError('Project not found', 404);

    // Check if custom domain is allowed
    const limits = getPlanLimits(project.user.plan);
    const customDomains = await prisma.domain.count({
      where: { projectId, type: 'CUSTOM' }
    });

    if (project.user.plan === 'FREE' && customDomains >= 0) {
      throw new AppError('Custom domains require at least the Starter plan', 403);
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(name)) {
      throw new AppError('Invalid domain format', 400);
    }

    const domain = await prisma.domain.create({
      data: {
        projectId,
        name,
        type: 'CUSTOM',
        sslEnabled: true,
        verified: false,
      }
    });

    // In production: trigger DNS verification and SSL provisioning
    // For now, auto-verify for demo
    setTimeout(async () => {
      await prisma.domain.update({
        where: { id: domain.id },
        data: { verified: true, verifiedAt: new Date() }
      });
    }, 2000);

    return domain;
  }

  static async deleteDomain(userId: string, projectId: string, domainId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    await prisma.domain.delete({
      where: { id: domainId, projectId }
    });

    return { message: 'Domain removed' };
  }

  static async updateDNS(userId: string, projectId: string, domainId: string, dnsRecords: any[]) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.domain.update({
      where: { id: domainId, projectId },
      data: { dnsRecords }
    });
  }

  static async updateRedirects(userId: string, projectId: string, domainId: string, redirects: any[]) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.domain.update({
      where: { id: domainId, projectId },
      data: { redirects }
    });
  }
}
