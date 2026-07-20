import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { generateSlug, getPlanLimits, formatBytes } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
import { Framework, SourceType } from '@prisma/client';

export class ProjectService {
  static async getProjects(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        domains: true,
        _count: {
          select: { deployments: true, domains: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  static async getProject(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        envVars: true,
        domains: true,
        files: true,
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        }
      }
    });

    if (!project) throw new AppError('Project not found', 404);
    return project;
  }

  static async createProject(userId: string, data: {
    name: string;
    description?: string;
    framework?: Framework;
    sourceType?: SourceType;
    gitUrl?: string;
    gitBranch?: string;
    buildCommand?: string;
    outputDir?: string;
  }) {
    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const limits = getPlanLimits(user.plan);
    const projectCount = await prisma.project.count({ where: { userId } });

    if (projectCount >= limits.projects) {
      throw new AppError(
        'You have reached your project limit. Upgrade your plan to create more projects.',
        403
      );
    }

    const slug = generateSlug(data.name);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        framework: data.framework || 'HTML',
        sourceType: data.sourceType || 'GIT',
        gitUrl: data.gitUrl,
        gitBranch: data.gitBranch || 'main',
        buildCommand: data.buildCommand || 'npm run build',
        outputDir: data.outputDir || 'dist',
        userId,
      }
    });

    // Create default subdomain
    await prisma.domain.create({
      data: {
        projectId: project.id,
        name: `${slug}.alexadb.app`,
        type: 'SUBDOMAIN',
        verified: true,
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Project Created',
        message: `Project "${data.name}" has been created successfully.`,
        type: 'SUCCESS',
      }
    });

    return project;
  }

  static async updateProject(userId: string, projectId: string, data: {
    name?: string;
    description?: string;
    framework?: Framework;
    buildCommand?: string;
    outputDir?: string;
    gitBranch?: string;
  }) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) throw new AppError('Project not found', 404);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data
    });

    return updated;
  }

  static async deleteProject(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) throw new AppError('Project not found', 404);

    await prisma.project.delete({ where: { id: projectId } });

    // Clean up Redis cache
    await redis.del(`project:${projectId}:*`);

    return { message: 'Project deleted successfully' };
  }

  static async getProjectStats(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        _count: {
          select: { deployments: true, domains: true, files: true }
        }
      }
    });

    if (!project) throw new AppError('Project not found', 404);

    const latestDeployment = await prisma.deployment.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...project,
      totalDeployments: project._count.deployments,
      totalDomains: project._count.domains,
      totalFiles: project._count.files,
      latestDeployment,
      storageFormatted: formatBytes(Number(project.storageUsed)),
      bandwidthFormatted: formatBytes(Number(project.bandwidthUsed)),
    };
  }

  // Environment Variables
  static async getEnvVars(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.envVar.findMany({
      where: { projectId },
      select: { id: true, key: true, createdAt: true, updatedAt: true }
    });
  }

  static async addEnvVar(userId: string, projectId: string, key: string, value: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    const encryptedValue = Buffer.from(value).toString('base64');

    return prisma.envVar.upsert({
      where: { projectId_key: { projectId, key } },
      update: { value: encryptedValue },
      create: { projectId, key, value: encryptedValue }
    });
  }

  static async deleteEnvVar(userId: string, projectId: string, envVarId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    await prisma.envVar.delete({
      where: { id: envVarId, projectId }
    });

    return { message: 'Environment variable deleted' };
  }

  // File Manager
  static async getFiles(userId: string, projectId: string, path: string = '/') {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.file.findMany({
      where: { projectId, path: { startsWith: path } }
    });
  }

  static async createFile(userId: string, projectId: string, data: {
    name: string;
    path: string;
    content?: string;
    isFolder?: boolean;
  }) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.file.create({
      data: {
        projectId,
        name: data.name,
        path: data.path,
        content: data.content,
        isFolder: data.isFolder || false,
      }
    });
  }

  static async deleteFile(userId: string, projectId: string, fileId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    await prisma.file.delete({
      where: { id: fileId, projectId }
    });

    return { message: 'File deleted' };
  }
}
