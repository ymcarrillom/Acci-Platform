import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser({ email, fullName, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, passwordHash, isActive: true },
    create: { email, fullName, role, passwordHash, isActive: true },
  });
}

async function main() {
  const password = 'Acci12345*';

  const admin = await upsertUser({ email: 'carri_2286@hotmail.com', fullName: 'Admin ACCI', role: 'ADMIN', password: 'Matias15' });
  const recovery = await upsertUser({ email: 'recovery@acci.com', fullName: 'Recuperación ACCI', role: 'ADMIN', password: 'Acci-Recovery-2026!' });
  const profe = await upsertUser({ email: 'profe@acci.com', fullName: 'Profesor ACCI', role: 'TEACHER', password });
  const estudiante = await upsertUser({ email: 'estudiante@acci.com', fullName: 'Estudiante ACCI', role: 'STUDENT', password });

  console.log('✅ Seed listo: admin/recovery/profe/estudiante');

  // ===== Curso de ejemplo =====
  const course = await prisma.course.upsert({
    where: { code: 'PROG-101' },
    update: {},
    create: {
      code: 'PROG-101',
      name: 'Introducción a la Programación',
      description: 'Curso introductorio de programación con JavaScript',
      teacherId: profe.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-06-15'),
    },
  });

  // Inscribir estudiante
  await prisma.courseEnrollment.upsert({
    where: { courseId_studentId: { courseId: course.id, studentId: estudiante.id } },
    update: {},
    create: { courseId: course.id, studentId: estudiante.id },
  });

  console.log('✅ Curso PROG-101 + enrollment');

  // ===== Limpiar actividades previas del curso =====
  await prisma.activity.deleteMany({ where: { courseId: course.id } });

  // ===== Quiz con 3 preguntas =====
  const quiz = await prisma.activity.create({
    data: {
      courseId: course.id,
      type: 'QUIZ',
      title: 'Quiz 1: Fundamentos de JavaScript',
      description: 'Evalúa tus conocimientos básicos de JavaScript.',
      order: 1,
      isPublished: true,
      showScore: true,
      showAnswers: false,
      timeLimit: 15,
      questions: {
        create: [
          {
            type: 'MULTIPLE_CHOICE',
            text: '¿Cuál de los siguientes NO es un tipo primitivo en JavaScript?',
            order: 1,
            points: 2,
            options: {
              create: [
                { text: 'string', isCorrect: false, order: 1 },
                { text: 'number', isCorrect: false, order: 2 },
                { text: 'array', isCorrect: true, order: 3 },
                { text: 'boolean', isCorrect: false, order: 4 },
              ],
            },
          },
          {
            type: 'TRUE_FALSE',
            text: 'JavaScript es un lenguaje de tipado estático.',
            order: 2,
            points: 1,
            options: {
              create: [
                { text: 'Verdadero', isCorrect: false, order: 1 },
                { text: 'Falso', isCorrect: true, order: 2 },
              ],
            },
          },
          {
            type: 'OPEN_ENDED',
            text: 'Explica la diferencia entre let, const y var en JavaScript.',
            order: 3,
            points: 3,
          },
        ],
      },
    },
  });

  console.log('✅ Quiz creado:', quiz.title);

  // ===== Tarea =====
  const tarea = await prisma.activity.create({
    data: {
      courseId: course.id,
      type: 'TASK',
      title: 'Tarea 1: Calculadora en JavaScript',
      description: 'Crea una calculadora básica usando funciones en JavaScript. Debe soportar suma, resta, multiplicación y división.',
      order: 2,
      dueDate: new Date('2026-03-01'),
      isPublished: true,
      showScore: true,
    },
  });

  console.log('✅ Tarea creada:', tarea.title);

  // ===== Material de clase =====
  const material = await prisma.activity.create({
    data: {
      courseId: course.id,
      type: 'MATERIAL',
      title: 'Clase 1: Introducción a Variables',
      description: 'En esta clase veremos los conceptos fundamentales de variables en JavaScript:\n\n- Declaración con var, let y const\n- Scope y hoisting\n- Tipos de datos primitivos\n- Conversión de tipos\n\nRecuerda practicar los ejemplos en tu consola del navegador.',
      order: 0,
      isPublished: true,
    },
  });

  console.log('✅ Material creado:', material.title);
  console.log('✅ Seed completo con actividades');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
