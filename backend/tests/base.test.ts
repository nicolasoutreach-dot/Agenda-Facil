import request from 'supertest';
import app from '../src/app.js';

describe('API health endpoints', () => {
  test('GET /health should return status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('Unknown routes should return 404', async () => {
    const response = await request(app).get('/unknown-endpoint');
    expect(response.statusCode).toBe(404);
  });
});
