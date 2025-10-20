import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import prisma, { connectDatabase, disconnectDatabase } from '../src/database/prisma.js';

describe('Postgres persistence integration', () => {
  const testUser = {
    name: 'Postgres Integration User',
    email: `postgres_integration_${Date.now()}@agenda.com`,
    password: 'postgres_secure_password!',
    nomeDoNegocio: 'Postgres Bistro',
    servicos: ['Consultoria premium'],
    horarios: { terca: ['09:00-12:00'] },
    politicaConfirmacao: 'manual',
    onboardingIncompleto: false,
  };

  let skipPostgresTests = false;

  beforeAll(async () => {
    process.env.USE_IN_MEMORY_STORE = 'false';
    try {
      await connectDatabase();
    } catch (error) {
      skipPostgresTests = true;
      console.warn(
        'Skipping PostgreSQL integration tests. Reason:',
        error?.message ?? error,
      );
      return;
    }
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    if (skipPostgresTests) {
      process.env.USE_IN_MEMORY_STORE = 'true';
      return;
    }

    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await disconnectDatabase();
    process.env.USE_IN_MEMORY_STORE = 'true';
  });

  it('persists users and hashed passwords in PostgreSQL', async () => {
    if (skipPostgresTests) {
      return;
    }

    const registerResponse = await request(app).post('/api/v1/users/register').send({
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
      nomeDoNegocio: testUser.nomeDoNegocio,
      servicos: testUser.servicos,
      horarios: testUser.horarios,
      politicaConfirmacao: testUser.politicaConfirmacao,
      onboardingIncompleto: testUser.onboardingIncompleto,
    });

    expect([201, 409]).toContain(registerResponse.statusCode);

    const dbUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(testUser.email);
    expect(dbUser?.nomeDoNegocio).toBe(testUser.nomeDoNegocio);
    expect(dbUser?.servicos).toEqual(testUser.servicos);
    expect(dbUser?.horarios).toEqual(testUser.horarios);
    expect(dbUser?.politicaConfirmacao).toBe('manual');
    expect(dbUser?.onboardingIncompleto).toBe(false);
    expect(dbUser?.password).toBeDefined();
    expect(dbUser?.password).not.toBe(testUser.password);
    await expect(bcrypt.compare(testUser.password, dbUser?.password ?? '')).resolves.toBe(true);
  });

  it('stores refresh tokens associated to the user', async () => {
    if (skipPostgresTests) {
      return;
    }

    const loginResponse = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body).toHaveProperty('refreshToken');

    const dbUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    expect(dbUser).not.toBeNull();

    const refreshTokenRow = await prisma.refreshToken.findFirst({
      where: { userId: dbUser?.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(refreshTokenRow).not.toBeNull();
    expect(refreshTokenRow?.token).toBe(loginResponse.body.refreshToken);
  });
});
