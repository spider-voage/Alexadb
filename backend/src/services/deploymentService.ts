import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export class DeploymentService {
  static async createDeployment(userId: string, projectId: string, data?: {
    commitMessage?: string;
    commitSha?: string;
  }) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) throw new AppError('Project not found', 404);

    // Check if project is already building
    const building = await prisma.deployment.findFirst({
      where: { projectId, status: 'BUILDING' }
    });

    if (building) {
      throw new AppError('A deployment is already in progress', 409);
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: 'PENDING',
        commitMessage: data?.commitMessage || 'Manual deployment',
        commitSha: data?.commitSha,
      }
    });

    // Queue build job (would be processed by a worker in production)
    await redis.lpush('build:queue', JSON.stringify({
      deploymentId: deployment.id,
      projectId,
      framework: project.framework,
      gitUrl: project.gitUrl,
      buildCommand: project.buildCommand,
      outputDir: project.outputDir,
    }));

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'BUILDING' }
    });

    // Start simulated build process
    this.processBuild(deployment.id, projectId);

    return deployment;
  }

  static async processBuild(deploymentId: string, projectId: string) {
    try {
      // Update to building
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'BUILDING' }
      });

      // Simulate build process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Build log simulation
      const buildLog = `[${new Date().toISOString()}] Build started...
[${new Date().toISOString()}] Installing dependencies...
[${new Date().toISOString()}] Dependencies installed successfully
[${new Date().toISOString()}] Running build command...
[${new Date().toISOString()}] Build completed successfully
[${new Date().toISOString()}] Optimizing assets...
[${new Date().toISOString()}] Deployment ready`;

      // Update deployment
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'DEPLOYED',
          buildLog,
          buildTime: 3,
          previewUrl: `https://${projectId}.alexadb.app`,
          completedAt: new Date(),
        }
      });

      // Update project
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'DEPLOYED' }
      });

      // Create notification
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      await prisma.notification.create({
        data: {
          userId: project!.userId,
          title: 'Deployment Successful',
          message: `Project "${project!.name}" deployed successfully.`,
          type: 'DEPLOYMENT',
        }
      });

      logger.info(`Deployment ${deploymentId} completed successfully`);
    } catch (error) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        }
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' }
      });

      logger.error(`Deployment ${deploymentId} failed:`, error);
    }
  }

  static async getDeployments(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getDeployment(userId: string, projectId: string, deploymentId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.deployment.findFirst({
      where: { id: deploymentId, projectId }
    });
  }

  static async getBuildLog(userId: string, projectId: string, deploymentId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, projectId }
    });

    if (!deployment) throw new AppError('Deployment not found', 404);

    return { log: deployment.buildLog || 'No build log available' };
  }

  static async rollback(userId: string, projectId: string, deploymentId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, projectId }
    });
    if (!deployment) throw new AppError('Deployment not found', 404);

    // Mark as rolled back
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'ROLLED_BACK' }
    });

    // Create new deployment from rolled back one
    const newDeployment = await prisma.deployment.create({
      data: {
        projectId,
        status: 'DEPLOYED',
        commitMessage: `Rollback to ${deployment.commitSha || deploymentId}`,
        previewUrl: deployment.previewUrl,
        completedAt: new Date(),
      }
    });

    return newDeployment;
  }

  static async redeploy(userId: string, projectId: string, deploymentId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!project) throw new AppError('Project not found', 404);

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, projectId }
    });
    if (!deployment) throw new AppError('Deployment not found', 404);

    return this.createDeployment(userId, projectId, {
      commitMessage: `Redeploy: ${deployment.commitMessage}`,
      commitSha: deployment.commitSha,
    });
  }
}
