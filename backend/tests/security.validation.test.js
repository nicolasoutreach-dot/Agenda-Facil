import request from 'supertest';
import app from '../src/app.js';

describe('Security validation hardening', () => {
  describe('HTML and script sanitization', () => {
    it('rejects payloads containing HTML snippets', async () => {
      const response = await request(app).post('/api/v1/users/register').send({
        name: '<script>alert(1)</script>Jane Doe',
        email: `jane_html_${Date.now()}@example.com`,
        password: 'securePassword123',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body?.details?.name?.[0]).toMatch(/HTML/i);
    });
  });

  describe('Unexpected fields handling', () => {
    it('rejects payloads with unexpected fields', async () => {
      const response = await request(app).post('/api/v1/users/register').send({
        name: 'Unexpected Field User',
        email: `unexpected_${Date.now()}@example.com`,
        password: 'securePassword123',
        role: 'admin',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body?.details?._unexpected).toEqual(
        expect.arrayContaining(['Role']),
      );
    });
  });

  describe('Normalization and trimming', () => {
    it('normalizes and trims user provided strings', async () => {
      const response = await request(app).post('/api/v1/users/register').send({
        name: '   Normalized User   ',
        email: `   normalized_${Date.now()}@EXAMPLE.com  `,
        password: 'securePassword123',
      });

      expect(response.statusCode).toBe(201);
      expect(response.body?.user?.name).toBe('Normalized User');
      expect(response.body?.user?.email).toMatch(/normalized_.*@example\.com/);
      expect(Array.isArray(response.body?.user?.servicos)).toBe(true);
      expect(response.body?.user?.servicos).toHaveLength(0);
      expect(response.body?.user?.politicaConfirmacao).toBe('manual');
      expect(response.body?.user?.onboardingIncompleto).toBe(true);
      expect(response.body?.user?.horarios).toEqual({});
      expect(response.body?.user?.nomeDoNegocio).toBeNull();
    });
  });

  describe('Token validation', () => {
    it('rejects tokens containing suspicious characters', async () => {
      const response = await request(app).post('/api/v1/auth/verify').send({
        token: 'abc123<svg/onload=alert(1)>',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body?.details?.token?.[0]).toMatch(/inválidos/i);
    });
  });

  describe('Request size limits', () => {
    it('returns 413 when the request body exceeds the configured limit', async () => {
      const oversizedName = 'A'.repeat(80 * 1024);

      const response = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send({
          name: oversizedName,
          email: `oversized_${Date.now()}@example.com`,
          password: 'securePassword123',
        });

      expect(response.statusCode).toBe(413);
    });
  });
});
