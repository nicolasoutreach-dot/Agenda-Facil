import request from 'supertest';
import app from '../src/app.js';

describe('API integration tests', () => {
  const testUser = {
    name: 'Test User',
    email: `agenda_test_user_${Date.now()}@agenda.com`,
    password: 'secure_password',
    nomeDoNegocio: 'Agenda Facil Testes',
    servicos: ['Consultoria personalizada', 'Aulas online'],
    horarios: { segunda: ['08:00-18:00'] },
    politicaConfirmacao: 'manual',
    onboardingIncompleto: false,
    phone: '+55 11 95555-0303',
    timezone: 'America/Sao_Paulo',
  };

  let authToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    const response = await request(app).post('/api/v1/users/register').send({
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

    if (![201, 409].includes(response.statusCode)) {
      throw new Error(`Failed to register test user. Status: ${response.statusCode}`);
    }

    if (response.statusCode === 201) {
      expect(response.body?.user?.nomeDoNegocio).toBe(testUser.nomeDoNegocio);
      expect(response.body?.user?.servicos).toEqual(testUser.servicos);
      expect(response.body?.user?.horarios).toEqual(testUser.horarios);
      expect(response.body?.user?.politicaConfirmacao).toBe('manual');
      expect(response.body?.user?.onboardingIncompleto).toBe(false);
    }
  });

  it('returns 200 for /health', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('authenticates the user and issues a JWT', async () => {
    const response = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(10);
    expect(response.body).toHaveProperty('refreshToken');
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.refreshToken.length).toBeGreaterThan(10);

    authToken = response.body.token;
    refreshToken = response.body.refreshToken;
  });

  it('allows access to the dashboard when a valid token is provided', async () => {
    expect(authToken).toBeTruthy();

    const response = await request(app)
      .get('/api/v1/users/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', `Welcome back, ${testUser.email}!`);
  });

  it('renews the access token when provided with a valid refresh token', async () => {
    expect(refreshToken).toBeTruthy();

    const response = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('refreshToken');

    authToken = response.body.token;
    refreshToken = response.body.refreshToken;
  });

  it('completes the password recovery flow', async () => {
    const forgotResponse = await request(app).post('/api/v1/auth/forgot-password').send({
      email: testUser.email,
    });

    expect(forgotResponse.statusCode).toBe(202);
    const resetToken = forgotResponse.body?.resetToken;
    expect(typeof resetToken).toBe('string');
    expect(resetToken.length).toBeGreaterThan(10);

    const newPassword = 'new_secure_password!';

    const resetResponse = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      password: newPassword,
    });

    expect(resetResponse.statusCode).toBe(200);

    const loginResponse = await request(app).post('/api/v1/users/login').send({
      email: testUser.email,
      password: newPassword,
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
    expect(loginResponse.body).toHaveProperty('refreshToken');

    authToken = loginResponse.body.token;
    refreshToken = loginResponse.body.refreshToken;
    testUser.password = newPassword;
  });
});
