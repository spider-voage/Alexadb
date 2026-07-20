import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class NotificationService {
  static async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });
    if (!notification) throw new AppError('Notification not found', 404);

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
    return { message: 'All notifications marked as read' };
  }

  static async deleteNotification(userId: string, notificationId: string) {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });
    return { message: 'Notification deleted' };
  }

  static async createNotification(userId: string, title: string, message: string, type: string = 'INFO') {
    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as any,
      }
    });
  }
}
