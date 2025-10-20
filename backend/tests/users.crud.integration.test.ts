import request from 'supertest';
import app from '../src/app.js';
import prisma, { connectDatabase, disconnectDatabase } from '../src/database/prisma.js';

describe('User CRUD and session flow', () => {
  const testUser = {
    name: 'CRUD Test User',
    email: `crud_test_${Date.now()}@agenda.com`,
    password: 'crud_secure_password!',
    nomeDoNegocio: 'CRUD Studio',
    servicos: ['Consultoria inicial'],
    horarios: { segunda: { inicio: '09:00', fim: '18:00' } },
    politicaConfirmacao: 'manual',
    onboardingIncompleto: false,
    phone: '+55 11 95555-0101',
    timezone: 'America/Sao_Paulo',
  };

  let authToken = '';
  let userId = '';
  let skipTests = false;

  beforeAll(async () => {
    process.env.USE_IN_MEMORY_STORE = 'false';
    try {
      await connectDatabase();
    } catch (error) {
      skipTests = true;
      console.warn('Skipping user CRUD integration tests. Reason:', error?.message ?? error);
      return;
    }

    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    if (skipTests) {
      process.env.USE_IN_MEMORY_STORE = 'true';
      return;
    }

    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });

    await disconnectDatabase();
    process.env.USE_IN_MEMORY_STORE = 'true';
  });

  it('creates, reads, updates and deletes a provider with authenticated session', async () => {
    if (skipTests) {
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
      phone: testUser.phone,
      timezone: testUser.timezone,
    });

    expect([201, 409]).toContain(registerResponse.statusCode);

    if (registerResponse.statusCode === 201) {
      expect(registerResponse.body?.user?.email).toBe(testUser.email);
      expect(registerResponse.body?.user?.nomeDoNegocio).toBe(testUser.nomeDoNegocio);
    }

    const loginResponse = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.statusCode).toBe(200);
    authToken = loginResponse.body.token;
    expect(typeof authToken).toBe('string');
    expect(authToken.length).toBeGreaterThan(10);

    userId = loginResponse.body?.user?.id;
    expect(userId).toBeTruthy();

    const meResponse = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body?.user?.id).toBe(userId);
    expect(meResponse.body?.user?.phone).toBe(testUser.phone);
    expect(meResponse.body?.user?.timezone).toBe(testUser.timezone);

    const showResponse = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(showResponse.statusCode).toBe(200);
    expect(showResponse.body?.user?.email).toBe(testUser.email);

    const updatedName = 'CRUD Test User Updated';
    const updatedBusiness = 'CRUD Studio Updated';

    const updateResponse = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: updatedName,
        nomeDoNegocio: updatedBusiness,
        servicos: ['Consultoria inicial', 'Pacote completo'],
        politicaConfirmacao: 'automatica',
        onboardingIncompleto: false,
        horarios: {
          terca: { inicio: '10:00', fim: '17:00' },
        },
        phone: '+55 11 95555-0202',
        timezone: 'America/New_York',
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body?.user?.name).toBe(updatedName);
    expect(updateResponse.body?.user?.nomeDoNegocio).toBe(updatedBusiness);
    expect(updateResponse.body?.user?.politicaConfirmacao).toBe('automatica');
    expect(Array.isArray(updateResponse.body?.user?.servicos)).toBe(true);
    expect(updateResponse.body?.user?.servicos).toContain('Pacote completo');
    expect(updateResponse.body?.user?.phone).toBe('+55 11 95555-0202');
    expect(updateResponse.body?.user?.timezone).toBe('America/New_York');

    const refreshedMeResponse = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(refreshedMeResponse.statusCode).toBe(200);
    expect(refreshedMeResponse.body?.user?.name).toBe(updatedName);
    expect(refreshedMeResponse.body?.user?.politicaConfirmacao).toBe('automatica');
    expect(refreshedMeResponse.body?.user?.phone).toBe('+55 11 95555-0202');
    expect(refreshedMeResponse.body?.user?.timezone).toBe('America/New_York');

    const deleteResponse = await request(app)
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.statusCode).toBe(204);

    const loginAfterDeletion = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginAfterDeletion.statusCode).toBe(401);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(dbUser).toBeNull();
  });
});
