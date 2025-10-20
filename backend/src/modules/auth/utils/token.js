import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '1h';
export const TOKEN_AUDIENCE = process.env.JWT_AUDIENCE ?? 'agenda-facil-users';
export const TOKEN_ISSUER = process.env.JWT_ISSUER ?? 'agenda-facil';

export function getJwtSecret() {
  return process.env.JWT_SECRET ?? 'test_secret_fallback';
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
    audience: TOKEN_AUDIENCE,
    issuer: TOKEN_ISSUER,
  });
}

export default signAccessToken;
