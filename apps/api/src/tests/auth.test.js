import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { prisma } from '../utils/prisma.js';

const TEST_EMAIL = 'test.auth@acci.com';
const TEST_PASSWORD = 'TestPass123!';

// Limpieza específica de este test file
async function cleanupAuthTestData() {
  await prisma.auditLog.deleteMany({ where: { user: { email: TEST_EMAIL } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

beforeAll(async () => {
  await cleanupAuthTestData();
  await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      fullName: 'Test Auth User',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
      isActive: true,
    },
  });
});

afterAll(async () => {
  await cleanupAuthTestData();
});

describe('POST /auth/login', () => {
  it('retorna 400 si faltan campos', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('retorna 400 con email inválido', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'no-es-email', password: TEST_PASSWORD });
    expect(res.status).toBe(400);
  });

  it('retorna 401 con usuario inexistente', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'noexiste@acci.com', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('retorna 401 con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass999!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/intentos fallidos/i);
  });

  it('retorna 200 con credenciales correctas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(TEST_EMAIL);
    // Cookie debe estar presente
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('retorna 403 si la cuenta está desactivada', async () => {
    await prisma.user.update({ where: { email: TEST_EMAIL }, data: { isActive: false } });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/desactivada/i);
    // Reactivar para tests posteriores
    await prisma.user.update({ where: { email: TEST_EMAIL }, data: { isActive: true } });
  });

  it('bloquea la cuenta tras 5 intentos fallidos', async () => {
    // Resetear a estado limpio (puede tener 1 intento del test anterior)
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    let lastRes;
    // El 5° intento activa el bloqueo y retorna 429
    for (let i = 0; i < 5; i++) {
      lastRes = await request(app)
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPass!' });
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body.message).toMatch(/bloqueada/i);

    // El siguiente intento también retorna 429 (cuenta sigue bloqueada)
    const res2 = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass!' });
    expect(res2.status).toBe(429);

    // Limpiar bloqueo para tests posteriores
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});

describe('POST /auth/refresh', () => {
  let refreshCookie;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    refreshCookie = res.headers['set-cookie']?.[0];
  });

  it('retorna 401 sin cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('retorna nuevo accessToken con cookie válida', async () => {
    const res = await request(app).post('/auth/refresh').set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });
});

describe('POST /auth/logout', () => {
  it('retorna 200 y limpia la cookie', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const cookie = loginRes.headers['set-cookie']?.[0];

    const res = await request(app).post('/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('retorna 200 incluso sin cookie (logout idempotente)', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
  });
});
