import request from 'supertest';
import app from '../src/app.js';
import prisma, { connectDatabase, disconnectDatabase } from '../src/database/prisma.js';

describe('Scheduling API integration', () => {
  const testUser = {
    name: 'Scheduling Test User',
    email: `scheduling_test_${Date.now()}@agenda.com`,
    password: 'scheduling_password!123',
    nomeDoNegocio: 'Agenda Facil Schedules',
    servicos: ['Servicos iniciais'],
    horarios: { segunda: ['09:00-18:00'] },
    politicaConfirmacao: 'manual',
    onboardingIncompleto: false,
    phone: '+55 11 96666-0101',
    timezone: 'America/Sao_Paulo',
  };

  let authToken = '';
  let providerId = '';
  let skipTests = false;

  beforeAll(async () => {
    process.env.USE_IN_MEMORY_STORE = 'false';
    try {
      await connectDatabase();
    } catch (error) {
      skipTests = true;
      console.warn('Skipping scheduling integration tests. Reason:', error?.message ?? error);
      return;
    }

    await prisma.paymentRecord.deleteMany({
      where: { provider: { email: testUser.email } },
    });
    await prisma.appointment.deleteMany({
      where: { provider: { email: testUser.email } },
    });
    await prisma.block.deleteMany({
      where: { provider: { email: testUser.email } },
    });
    await prisma.workingHours.deleteMany({
      where: { provider: { email: testUser.email } },
    });
    await prisma.service.deleteMany({
      where: { provider: { email: testUser.email } },
    });
    await prisma.customer.deleteMany({
      where: { provider: { email: testUser.email } },
    });
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

    await prisma.paymentRecord.deleteMany({
      where: { providerId },
    });
    await prisma.appointment.deleteMany({
      where: { providerId },
    });
    await prisma.block.deleteMany({
      where: { providerId },
    });
    await prisma.workingHours.deleteMany({
      where: { providerId },
    });
    await prisma.service.deleteMany({
      where: { providerId },
    });
    await prisma.customer.deleteMany({
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

  it('creates scheduling entities and returns overview with persisted data', async () => {
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

    const loginResponse = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.statusCode).toBe(200);
    authToken = loginResponse.body.token;
    expect(typeof authToken).toBe('string');
    expect(authToken.length).toBeGreaterThan(10);

    const userRow = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    expect(userRow).not.toBeNull();
    providerId = userRow?.id ?? '';
    expect(providerId).toBeTruthy();

    const serviceResponse = await request(app)
      .post('/api/v1/scheduling/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Corte Especial',
        description: 'Corte personalizado com finalizacao.',
        durationMinutes: 60,
        price: 120.5,
        currency: 'BRL',
        isActive: true,
        bufferBefore: 10,
        bufferAfter: 15,
      });

    expect(serviceResponse.statusCode).toBe(201);
    const serviceId = serviceResponse.body?.service?.id;
    expect(serviceId).toBeTruthy();

    const customerResponse = await request(app)
      .post('/api/v1/scheduling/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Cliente Teste',
        email: `cliente_${Date.now()}@teste.com`,
        phone: '+55 11 95555-0000',
        notes: 'Prefere atendimento nas segundas-feiras.',
        tags: ['vip', 'teste'],
      });

    expect(customerResponse.statusCode).toBe(201);
    const customerId = customerResponse.body?.customer?.id;
    expect(customerId).toBeTruthy();

    const workingHourCreateResponse = await request(app)
      .post('/api/v1/scheduling/working-hours')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        breakWindows: [{ start: '12:00', end: '13:00' }],
        timeZone: 'America/Sao_Paulo',
      });

    expect(workingHourCreateResponse.statusCode).toBe(201);
    const workingHourId = workingHourCreateResponse.body?.workingHour?.id;
    expect(workingHourId).toBeTruthy();

    const workingHourUpdateResponse = await request(app)
      .put(`/api/v1/scheduling/working-hours/${workingHourId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        endTime: '19:00',
      });

    expect(workingHourUpdateResponse.statusCode).toBe(200);
    expect(workingHourUpdateResponse.body?.workingHour?.endTime).toBe('19:00');

    const workingHoursListResponse = await request(app)
      .get('/api/v1/scheduling/working-hours')
      .set('Authorization', `Bearer ${authToken}`);

    expect(workingHoursListResponse.statusCode).toBe(200);
    expect(Array.isArray(workingHoursListResponse.body?.workingHours)).toBe(true);
    expect(workingHoursListResponse.body?.workingHours.length).toBeGreaterThanOrEqual(1);

    const blockStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const blockEnd = new Date(blockStart.getTime() + 60 * 60 * 1000);

    const blockResponse = await request(app)
      .post('/api/v1/scheduling/blocks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startsAt: blockStart.toISOString(),
        endsAt: blockEnd.toISOString(),
        reason: 'Manutencao rapida no estudio.',
        type: 'maintenance',
      });

    expect(blockResponse.statusCode).toBe(201);
    const blockId = blockResponse.body?.block?.id;
    expect(blockId).toBeTruthy();

    const blockDeleteResponse = await request(app)
      .delete(`/api/v1/scheduling/blocks/${blockId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(blockDeleteResponse.statusCode).toBe(204);

    const secondaryBlockStart = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const secondaryBlockEnd = new Date(secondaryBlockStart.getTime() + 90 * 60 * 1000);

    const secondaryBlockResponse = await request(app)
      .post('/api/v1/scheduling/blocks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startsAt: secondaryBlockStart.toISOString(),
        endsAt: secondaryBlockEnd.toISOString(),
        reason: 'Reuniao externa.',
        type: 'manual',
      });

    expect(secondaryBlockResponse.statusCode).toBe(201);

    const appointmentStart = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000);

    const appointmentResponse = await request(app)
      .post('/api/v1/scheduling/appointments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        serviceId,
        startsAt: appointmentStart.toISOString(),
        endsAt: appointmentEnd.toISOString(),
        status: 'confirmed',
        price: 120.5,
        currency: 'BRL',
        source: 'online',
        notes: 'Solicitou bebida de boas-vindas.',
      });

    expect(appointmentResponse.statusCode).toBe(201);
    const appointmentId = appointmentResponse.body?.appointment?.id;
    expect(appointmentId).toBeTruthy();

    const paymentResponse = await request(app)
      .post('/api/v1/scheduling/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        appointmentId,
        customerId,
        amount: 120.5,
        currency: 'BRL',
        method: 'pix',
        status: 'received',
        description: 'Pagamento integral confirmado.',
        recordedAt: new Date().toISOString(),
      });

    expect(paymentResponse.statusCode).toBe(201);
    const paymentId = paymentResponse.body?.payment?.id;
    expect(paymentId).toBeTruthy();

    const overviewResponse = await request(app)
      .get('/api/v1/scheduling/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(overviewResponse.statusCode).toBe(200);
    const overview = overviewResponse.body;
    expect(Array.isArray(overview.customers)).toBe(true);
    expect(Array.isArray(overview.services)).toBe(true);
    expect(Array.isArray(overview.appointments)).toBe(true);
    expect(Array.isArray(overview.workingHours)).toBe(true);
    expect(Array.isArray(overview.blocks)).toBe(true);
    expect(Array.isArray(overview.payments)).toBe(true);
    expect(overview.summary).toBeDefined();
    expect(overview.summary.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(overview.summary.totalServices).toBeGreaterThanOrEqual(1);
    expect(overview.summary.totalAppointments).toBeGreaterThanOrEqual(1);
    expect(overview.summary.totalRevenueReceived).toBeGreaterThanOrEqual(120);
  });
});
