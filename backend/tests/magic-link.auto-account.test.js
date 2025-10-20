import request from 'supertest';
import app from '../src/app.js';
import UserService from '../src/modules/users/services/UserService.js';

describe('Magic link automatic account creation', () => {
  it('creates a user automatically when verifying a magic link for a new email', async () => {
    const email = `magic_auto_${Date.now()}@example.com`;

    const requestResponse = await request(app).post('/api/v1/auth/request-magic-link').send({ email });
    expect(requestResponse.statusCode).toBe(202);
    const token = requestResponse.body?.magicLinkToken;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const verifyResponse = await request(app).post('/api/v1/auth/verify').send({ token });
    expect(verifyResponse.statusCode).toBe(200);

    const user = verifyResponse.body?.user;

    expect(user?.email).toBe(email);
    expect(user?.onboardingIncompleto).toBe(true);
    expect(user?.servicos).toEqual([]);
    expect(user?.horarios).toEqual({});
    expect(user?.politicaConfirmacao).toBe('manual');
    expect(user?.nomeDoNegocio).toBeNull();
    expect(user?.name).toMatch(/^magic_auto_/i);
    expect(verifyResponse.body?.shouldCompleteOnboarding).toBe(true);
    expect(verifyResponse.body?.nextRedirect).toBe('/onboarding');
    expect(verifyResponse.body?.requestedRedirect).toBeNull();
  });

  it('returns existing users and honors redirect when onboarding is complete', async () => {
    const email = `magic_existing_${Date.now()}@example.com`;
    const created = await UserService.ensureUserForEmail(email);
    await UserService.updateOnboardingStatus(created.id, false);

    const redirectTo = 'http://localhost:3000/dashboard';
    const requestResponse = await request(app)
      .post('/api/v1/auth/request-magic-link')
      .send({ email, redirectTo });

    expect(requestResponse.statusCode).toBe(202);
    const token = requestResponse.body?.magicLinkToken;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const verifyResponse = await request(app).post('/api/v1/auth/verify').send({ token });

    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.body?.user?.email).toBe(email);
    expect(verifyResponse.body?.shouldCompleteOnboarding).toBe(false);
    expect(verifyResponse.body?.nextRedirect).toBe(redirectTo);
    expect(verifyResponse.body?.requestedRedirect).toBe(redirectTo);
  });

  it('is idempotent when ensuring the same user concurrently', async () => {
    const email = `magic_race_${Date.now()}@example.com`;

    const [first, second] = await Promise.all([
      UserService.ensureUserForEmail(email),
      UserService.ensureUserForEmail(email),
    ]);

    expect(first.id).toBe(second.id);
    expect(first.onboardingIncompleto).toBe(true);

    const lookup = await UserService.findByEmail(email);
    expect(lookup?.id).toBe(first.id);
  });

  it('marks onboarding as complete through the dedicated endpoint', async () => {
    const email = `magic_onboarding_${Date.now()}@example.com`;

    const requestResponse = await request(app).post('/api/v1/auth/request-magic-link').send({ email });
    expect(requestResponse.statusCode).toBe(202);
    const token = requestResponse.body?.magicLinkToken;
    expect(typeof token).toBe('string');

    const verifyResponse = await request(app).post('/api/v1/auth/verify').send({ token });
    expect(verifyResponse.statusCode).toBe(200);
    const accessToken = verifyResponse.body?.accessToken;
    expect(typeof accessToken).toBe('string');

    const onboardingPayload = {
      nomeDoNegocio: 'Estudio Onboarding',
      servicos: ['Corte de cabelo', 'Barba premium'],
      horarios: {
        segunda: { inicio: '09:00', fim: '18:00' },
        quarta: { inicio: '10:00', fim: '16:00' },
      },
      politicaConfirmacao: 'automatica',
    };

    const completeResponse = await request(app)
      .post('/api/v1/users/onboarding/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(onboardingPayload);

    expect(completeResponse.statusCode).toBe(200);
    expect(completeResponse.body?.user?.email).toBe(email);
    expect(completeResponse.body?.user?.onboardingIncompleto).toBe(false);
    expect(completeResponse.body?.user?.nomeDoNegocio).toBe(onboardingPayload.nomeDoNegocio);
    expect(completeResponse.body?.user?.servicos).toEqual(onboardingPayload.servicos);
    expect(completeResponse.body?.user?.horarios).toEqual(onboardingPayload.horarios);
    expect(completeResponse.body?.user?.politicaConfirmacao).toBe(onboardingPayload.politicaConfirmacao);
    expect(completeResponse.body?.shouldCompleteOnboarding).toBe(false);

    const user = await UserService.findByEmail(email);
    expect(user?.onboardingIncompleto).toBe(false);
    expect(user?.nomeDoNegocio).toBe(onboardingPayload.nomeDoNegocio);
  });

  it('fails auto account creation when schema validation is violated', async () => {
    const email = `magic_invalid_${Date.now()}@example.com`;

    await expect(
      UserService.ensureUserForEmail(email, {
        nomeDoNegocio: 'ab',
      }),
    ).rejects.toThrow();
  });
});
