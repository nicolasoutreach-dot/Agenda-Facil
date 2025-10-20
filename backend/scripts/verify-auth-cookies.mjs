import request from 'supertest';
import app from '../src/app.js';

async function verifyAuthFlow() {
  const agent = request.agent(app);
  const uniqueSuffix = Date.now();
  const email = `cookie_test_${uniqueSuffix}@agenda.local`;
  const password = 'StrongPass!123';

  await agent.post('/api/v1/users/register').send({
    name: 'Cookie Test',
    email,
    password,
  });

  const loginResponse = await agent.post('/api/v1/users/login').send({
    email,
    password,
  });

  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${loginResponse.status}`);
  }

  const loginCookies = loginResponse.headers['set-cookie'] ?? [];

  const hasAccessCookie = loginCookies.some((cookie) => cookie.includes('accessToken='));
  const hasRefreshCookie = loginCookies.some((cookie) => cookie.includes('refreshToken='));
  const accessCookieHttpOnly = loginCookies
    .filter((cookie) => cookie.includes('accessToken='))
    .every((cookie) => cookie.toLowerCase().includes('httponly'));
  const refreshCookieHttpOnly = loginCookies
    .filter((cookie) => cookie.includes('refreshToken='))
    .every((cookie) => cookie.toLowerCase().includes('httponly'));

  if (!hasAccessCookie || !accessCookieHttpOnly) {
    throw new Error('Access token cookie missing or not HttpOnly');
  }

  if (!hasRefreshCookie || !refreshCookieHttpOnly) {
    throw new Error('Refresh token cookie missing or not HttpOnly');
  }

  const refreshResponse = await agent.post('/api/v1/auth/refresh').send({});

  if (refreshResponse.status !== 200) {
    throw new Error(`Refresh failed: ${refreshResponse.status}`);
  }

  const refreshCookies = refreshResponse.headers['set-cookie'] ?? [];
  if (
    !refreshCookies.some((cookie) => cookie.includes('accessToken=')) ||
    !refreshCookies.some((cookie) => cookie.includes('refreshToken='))
  ) {
    throw new Error('Refresh response did not rotate auth cookies');
  }

  const logoutResponse = await agent.post('/api/v1/auth/logout').send({});

  if (logoutResponse.status !== 204) {
    throw new Error(`Logout failed: ${logoutResponse.status}`);
  }

  const logoutCookies = logoutResponse.headers['set-cookie'] ?? [];
  const cookiesCleared = logoutCookies.every((cookie) =>
    /accessToken=;|refreshToken=;/i.test(cookie) && /expires=/i.test(cookie),
  );

  if (!cookiesCleared) {
    throw new Error('Logout did not clear auth cookies');
  }

  return {
    loginCookies,
    refreshCookies,
    logoutCookies,
  };
}

verifyAuthFlow()
  .then((result) => {
    console.log('Auth cookie verification succeeded.');
    console.log('Login Set-Cookie:', result.loginCookies);
    console.log('Refresh Set-Cookie:', result.refreshCookies);
    console.log('Logout Set-Cookie:', result.logoutCookies);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auth cookie verification failed:', error);
    process.exit(1);
  });
