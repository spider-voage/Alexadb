import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Plan } from '@prisma/client';

// NOTE: In production, integrate with Stripe, PayPal, etc.
// This is a placeholder implementation with clear integration points.

export class PaymentService {
  static PLANS = {
    FREE: { price: 0, name: 'Free' },
    STARTER: { price: 8, name: 'Starter' },
    PRO: { price: 20, name: 'Pro' },
    BUSINESS: { price: 50, name: 'Business' },
    ENTERPRISE: { price: null, name: 'Enterprise' },
  };

  static async getPlans() {
    return this.PLANS;
  }

  static async createPaymentIntent(userId: string, plan: Plan) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const planInfo = this.PLANS[plan];
    if (!planInfo) throw new AppError('Invalid plan', 400);

    if (plan === 'ENTERPRISE') {
      throw new AppError('Please contact sales for Enterprise plans', 400);
    }

    // PLACEHOLDER: Integrate with Stripe
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: planInfo.price * 100,
    //   currency: 'usd',
    //   customer: user.stripeCustomerId,
    // });

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: planInfo.price,
        currency: 'USD',
        status: 'PENDING',
        provider: 'STRIPE',
        plan,
      }
    });

    return {
      payment,
      clientSecret: 'pi_placeholder_secret', // Replace with actual Stripe client secret
      message: 'Payment intent created. Integrate with Stripe for production.',
    };
  }

  static async confirmPayment(userId: string, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId }
    });
    if (!payment) throw new AppError('Payment not found', 404);

    // PLACEHOLDER: Verify with Stripe
    // const stripePayment = await stripe.paymentIntents.retrieve(payment.providerId);
    // if (stripePayment.status !== 'succeeded') throw new AppError('Payment not completed', 400);

    // Update payment
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED' }
    });

    // Update user plan
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: payment.plan as Plan,
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Plan Upgraded',
        message: `Your plan has been upgraded to ${payment.plan}.`,
        type: 'BILLING',
      }
    });

    return { message: 'Payment confirmed and plan upgraded' };
  }

  static async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async applyCoupon(userId: string, code: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.active) throw new AppError('Invalid coupon code', 400);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon expired', 400);
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError('Coupon limit reached', 400);

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } }
    });

    return { coupon, discount: coupon.discount };
  }
}
