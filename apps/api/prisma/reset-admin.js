import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'carri_2286@hotmail.com';
const DEFAULT_PASSWORD = 'Matias15';

async function main() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const admin = await prisma.user.findFirst({ where: { email: DEFAULT_EMAIL } });

  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hash, isActive: true },
    });
    console.log(`Contraseña del admin (${DEFAULT_EMAIL}) reseteada.`);
  } else {
    await prisma.user.create({
      data: {
        email: DEFAULT_EMAIL,
        fullName: 'Admin ACCI',
        role: 'ADMIN',
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log(`Admin (${DEFAULT_EMAIL}) creado con contraseña por defecto.`);
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
