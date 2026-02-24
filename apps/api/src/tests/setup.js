import { prisma } from '../utils/prisma.js';

// Cada test file limpia sus propios datos (ver beforeAll en cada archivo).
// Solo desconectamos Prisma al final de todos los tests.
afterAll(async () => {
  await prisma.$disconnect();
});
