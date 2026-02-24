import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { prisma } from '../utils/prisma.js';

const TEST_EMAILS = [
  'admin.courses@acci.com',
  'teacher.courses@acci.com',
  'student.courses@acci.com',
];

async function cleanupCoursesTestData() {
  await prisma.course.deleteMany({ where: { code: 'TEST-101' } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: TEST_EMAILS } } } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
}

afterAll(async () => {
  await cleanupCoursesTestData();
});

// ===== Helpers =====
async function createUser({ email, role, password = 'TestPass123!' }) {
  return prisma.user.upsert({
    where: { email },
    update: { role, isActive: true, passwordHash: await bcrypt.hash(password, 10) },
    create: {
      email,
      fullName: `Test ${role}`,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

async function getToken(email, password = 'TestPass123!') {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.accessToken;
}

// ===== Setup =====
let adminToken, teacherToken, studentToken;
let teacherId;

beforeAll(async () => {
  await cleanupCoursesTestData();
  const admin = await createUser({ email: 'admin.courses@acci.com', role: 'ADMIN' });
  const teacher = await createUser({ email: 'teacher.courses@acci.com', role: 'TEACHER' });
  await createUser({ email: 'student.courses@acci.com', role: 'STUDENT' });

  teacherId = teacher.id;

  adminToken = await getToken('admin.courses@acci.com');
  teacherToken = await getToken('teacher.courses@acci.com');
  studentToken = await getToken('student.courses@acci.com');
});

// ===== Tests =====
describe('GET /courses', () => {
  it('retorna 401 sin token', async () => {
    const res = await request(app).get('/courses');
    expect(res.status).toBe(401);
  });

  it('retorna lista de cursos para ADMIN', async () => {
    const res = await request(app).get('/courses').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('courses');
    expect(Array.isArray(res.body.courses)).toBe(true);
  });

  it('retorna lista de cursos para TEACHER', async () => {
    const res = await request(app).get('/courses').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.courses)).toBe(true);
  });

  it('retorna lista de cursos para STUDENT', async () => {
    const res = await request(app).get('/courses').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.courses)).toBe(true);
  });
});

describe('POST /courses', () => {
  const newCourse = {
    code: 'TEST-101',
    name: 'Curso de Prueba',
    description: 'Descripción del curso de prueba',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  };

  it('retorna 401 sin token', async () => {
    const res = await request(app).post('/courses').send(newCourse);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si no es ADMIN', async () => {
    const res = await request(app)
      .post('/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ ...newCourse, teacherId });
    expect(res.status).toBe(403);
  });

  it('retorna 400 con datos inválidos', async () => {
    const res = await request(app)
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'X' }); // code muy corto
    expect(res.status).toBe(400);
  });

  it('crea un curso correctamente como ADMIN', async () => {
    const res = await request(app)
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newCourse, teacherId });
    expect(res.status).toBe(201);
    expect(res.body.course).toHaveProperty('id');
    expect(res.body.course.code).toBe('TEST-101');
  });

  it('retorna 409 si el código de curso ya existe', async () => {
    const res = await request(app)
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newCourse, teacherId });
    expect(res.status).toBe(409);
  });
});

describe('GET /health', () => {
  it('retorna ok con DB conectada', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('connected');
  });
});
