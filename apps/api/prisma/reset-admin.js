import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('❌ SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD son requeridas');
  process.exit(1);
}

async function main() {
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.findFirst({ where: { email } });

  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hash, isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
    console.log(`✅ Contraseña del admin (${email}) reseteada.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        fullName: 'Admin ACCI',
        role: 'ADMIN',
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log(`✅ Admin (${email}) creado.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
