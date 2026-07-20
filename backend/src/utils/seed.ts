import { prisma } from '../config/database';
import { hashPassword } from './helpers';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminExists = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@alexadb.com',
        password: await hashPassword('admin123'),
        name: 'Super Admin',
        role: 'SUPERADMIN',
        emailVerified: true,
        plan: 'ENTERPRISE',
      }
    });
    console.log('✅ Admin user created: admin@alexadb.com / admin123');
  }

  // Create demo coupons
  const coupons = [
    { code: 'WELCOME20', description: '20% off your first month', discount: 20 },
    { code: 'PRO50', description: '50% off Pro plan', discount: 50 },
    { code: 'STARTUP', description: 'Startup special', discount: 30 },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
  }
  console.log('✅ Coupons seeded');

  console.log('🎉 Seeding complete!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
