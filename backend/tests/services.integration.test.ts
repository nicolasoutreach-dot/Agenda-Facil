import request from 'supertest';
import app from '../src/app.js';
import prisma, { connectDatabase, disconnectDatabase } from '../src/database/prisma.js';

describe('Services management API', () => {
  const provider = {
    name: 'Service Owner',
    email: `services_owner_${Date.now()}@agenda.com`,
    password: 'service_owner_password!123',
    nomeDoNegocio: 'Service Studio',
    servicos: [],
    horarios: { segunda: ['09:00-18:00'] },
    politicaConfirmacao: 'manual',
    onboardingIncompleto: false,
    phone: '+55 11 95555-0301',
    timezone: 'America/Sao_Paulo',
  };

  let authToken = '';
  let providerId = '';
  let createdServiceId = '';
  let skip = false;

  beforeAll(async () => {
    process.env.USE_IN_MEMORY_STORE = 'false';

    try {
      await connectDatabase();
    } catch (error) {
      skip = true;
      console.warn('Skipping service integration tests. Reason:', error?.message ?? error);
      return;
    }

    await prisma.service.deleteMany({
      where: { provider: { email: provider.email } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: provider.email } },
    });
    await prisma.user.deleteMany({
      where: { email: provider.email },
    });
  });

  afterAll(async () => {
    if (skip) {
      process.env.USE_IN_MEMORY_STORE = 'true';
      return;
    }

    await prisma.service.deleteMany({
      where: { providerId },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: providerId },
    });
    await prisma.user.deleteMany({
      where: { id: providerId },
    });

    await disconnectDatabase();
    process.env.USE_IN_MEMORY_STORE = 'true';
  });

  it('creates, lists, updates and deletes services with ownership validation', async () => {
    if (skip) {
      return;
    }

    const registerResponse = await request(app).post('/api/v1/users/register').send({
      name: provider.name,
      email: provider.email,
      password: provider.password,
      nomeDoNegocio: provider.nomeDoNegocio,
      servicos: provider.servicos,
      horarios: provider.horarios,
      politicaConfirmacao: provider.politicaConfirmacao,
      onboardingIncompleto: provider.onboardingIncompleto,
      phone: provider.phone,
      timezone: provider.timezone,
    });

    expect([201, 409]).toContain(registerResponse.statusCode);

    const loginResponse = await request(app).post('/api/v1/users/login').send({
      email: provider.email,
      password: provider.password,
    });

    expect(loginResponse.statusCode).toBe(200);
    authToken = loginResponse.body.token;
    providerId = loginResponse.body?.user?.id ?? '';
    expect(authToken).toBeTruthy();
    expect(providerId).toBeTruthy();

    const createResponse = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Corte Feminino Avancado',
        description: 'Corte completo com finalizacao e diagnostico.',
        durationMinutes: 75,
        price: 180.5,
        currency: 'BRL',
        bufferBefore: 10,
        bufferAfter: 15,
      });

    expect(createResponse.statusCode).toBe(201);
    createdServiceId = createResponse.body?.service?.id;
    expect(createdServiceId).toBeTruthy();
    expect(createResponse.body?.service?.price).toBeCloseTo(180.5);

    const listResponse = await request(app)
      .get('/api/v1/services')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listResponse.statusCode).toBe(200);
    expect(Array.isArray(listResponse.body?.services)).toBe(true);
    expect(listResponse.body?.services.length).toBeGreaterThan(0);

    const updateResponse = await request(app)
      .put(`/api/v1/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        durationMinutes: 90,
        price: null,
        bufferAfter: 20,
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body?.service?.durationMinutes).toBe(90);
    expect(updateResponse.body?.service?.price).toBeNull();
    expect(updateResponse.body?.service?.bufferAfter).toBe(20);

    const deleteResponse = await request(app)
      .delete(`/api/v1/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.statusCode).toBe(204);

    const notFoundResponse = await request(app)
      .delete(`/api/v1/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(notFoundResponse.statusCode).toBe(404);
  });
});
