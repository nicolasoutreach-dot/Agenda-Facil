const DEFAULT_ACCESS_TOKEN_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME ?? 'accessToken';
const DEFAULT_REFRESH_TOKEN_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'refreshToken';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 hour fall back

const rawSameSite = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
const allowedSameSite = ['lax', 'strict', 'none'];

const sameSite = allowedSameSite.includes(rawSameSite) ? rawSameSite : 'lax';

const secureByDefault =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');

function normalizeBooleanEnv(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function parseDurationToMs(value) {
  if (value === null || value === undefined) {
    return DEFAULT_ACCESS_TOKEN_MAX_AGE;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1 ? value : DEFAULT_ACCESS_TOKEN_MAX_AGE;
  }

  const raw = String(value).trim().toLowerCase();

  if (!raw) {
    return DEFAULT_ACCESS_TOKEN_MAX_AGE;
  }

  // Support tokens such as "3600", "3600s", "60m", "1h", "2d"
  const simpleMatch = raw.match(/^(\d+)(ms|s|m|h|d)?$/);

  if (simpleMatch) {
    const amount = Number(simpleMatch[1]);
    const unit = simpleMatch[2] ?? 's';

    switch (unit) {
      case 'ms':
        return amount;
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * DAY_IN_MS;
      default:
        return DEFAULT_ACCESS_TOKEN_MAX_AGE;
    }
  }

  // Support formats like "1 hour", "2 days"
  const extendedMatch = raw.match(/^(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days)$/);

  if (extendedMatch) {
    const amount = Number(extendedMatch[1]);
    const unit = extendedMatch[2];

    switch (unit) {
      case 'second':
      case 'seconds':
        return amount * 1000;
      case 'minute':
      case 'minutes':
        return amount * 60 * 1000;
      case 'hour':
      case 'hours':
        return amount * 60 * 60 * 1000;
      case 'day':
      case 'days':
        return amount * DAY_IN_MS;
      default:
        return DEFAULT_ACCESS_TOKEN_MAX_AGE;
    }
  }

  return DEFAULT_ACCESS_TOKEN_MAX_AGE;
}

function getBaseCookieOptions() {
  const secure = normalizeBooleanEnv(process.env.COOKIE_SECURE, secureByDefault);
  const baseOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: process.env.COOKIE_PATH ?? '/',
  };

  if (process.env.COOKIE_DOMAIN) {
    baseOptions.domain = process.env.COOKIE_DOMAIN;
  }

  return baseOptions;
}

export function getAccessTokenCookieName() {
  return DEFAULT_ACCESS_TOKEN_NAME;
}

export function getRefreshTokenCookieName() {
  return DEFAULT_REFRESH_TOKEN_NAME;
}

export function getAccessTokenCookieOptions(accessTokenTtl) {
  return {
    ...getBaseCookieOptions(),
    maxAge: parseDurationToMs(accessTokenTtl),
  };
}

export function getRefreshTokenCookieOptions(expiresAt) {
  const maxAgeCandidate =
    expiresAt instanceof Date
      ? expiresAt.getTime() - Date.now()
      : expiresAt
        ? new Date(expiresAt).getTime() - Date.now()
        : Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7) * DAY_IN_MS;

  const maxAge = Number.isFinite(maxAgeCandidate) && maxAgeCandidate > 0 ? maxAgeCandidate : DAY_IN_MS;

  return {
    ...getBaseCookieOptions(),
    maxAge,
  };
}

export function setAuthCookies(res, { accessToken, refreshToken, refreshTokenExpiresAt, accessTokenTtl }) {
  const accessTokenName = getAccessTokenCookieName();
  const refreshTokenName = getRefreshTokenCookieName();

  res.cookie(accessTokenName, accessToken, getAccessTokenCookieOptions(accessTokenTtl));

  if (refreshToken) {
    res.cookie(
      refreshTokenName,
      refreshToken,
      getRefreshTokenCookieOptions(refreshTokenExpiresAt),
    );
  }
}

export function clearAuthCookies(res) {
  const accessTokenName = getAccessTokenCookieName();
  const refreshTokenName = getRefreshTokenCookieName();
  const baseOptions = getBaseCookieOptions();

  res.clearCookie(accessTokenName, baseOptions);
  res.clearCookie(refreshTokenName, baseOptions);
}

export function parseCookies(req) {
  const header = req.headers?.cookie;

  if (!header) {
    return {};
  }

  return header.split(';').reduce((accumulator, chunk) => {
    const [namePart, ...valueParts] = chunk.split('=');
    if (!namePart) {
      return accumulator;
    }

    const name = decodeURIComponent(namePart.trim());
    const value = decodeURIComponent(valueParts.join('=').trim());

    if (name) {
      accumulator[name] = value;
    }

    return accumulator;
  }, {});
}

export function getCookie(req, name) {
  return parseCookies(req)[name];
}

export function getRefreshTokenFromRequest(req, fallbackValue) {
  return fallbackValue ?? getCookie(req, getRefreshTokenCookieName());
}

export function getAccessTokenFromRequest(req) {
  return getCookie(req, getAccessTokenCookieName());
}
