import crypto from 'node:crypto';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';

const MAGIC_LINK_TTL_MINUTES = Number(process.env.MAGIC_LINK_TTL_MINUTES ?? 15);
const MAGIC_LINK_TOKEN_BYTES = Number(process.env.MAGIC_LINK_TOKEN_BYTES ?? 32);
const MAGIC_LINK_BASE_URL =
  process.env.MAGIC_LINK_BASE_URL ?? 'http://localhost:3001/auth/magic-link';
const MAGIC_LINK_DELIVERY_STRATEGY =
  process.env.MAGIC_LINK_DELIVERY_STRATEGY?.toLowerCase() ?? 'console';

const inMemoryMagicLinks = new Map();

function calculateMagicLinkExpiry() {
  return new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);
}

function createMagicLinkTokenValue() {
  return crypto.randomBytes(MAGIC_LINK_TOKEN_BYTES).toString('hex');
}

function buildMagicLinkUrl(token, redirectTo) {
  const baseUrl = redirectTo ?? MAGIC_LINK_BASE_URL;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch (error) {
    // Fallback for cases where baseUrl is not a valid absolute URL.
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}

async function deliverMagicLinkEmail(email, link) {
  if (MAGIC_LINK_DELIVERY_STRATEGY === 'console') {
    console.info(`[MagicLink] Sending login link to ${email}: ${link}`);
    return true;
  }

  if (MAGIC_LINK_DELIVERY_STRATEGY === 'noop') {
    return false;
  }

  console.warn(
    `Unsupported MAGIC_LINK_DELIVERY_STRATEGY "${MAGIC_LINK_DELIVERY_STRATEGY}". Defaulting to no delivery.`,
  );
  return false;
}

class MagicLinkService {
  async request(email, { redirectTo } = {}) {
    const token = createMagicLinkTokenValue();
    const expiresAt = calculateMagicLinkExpiry();
    const createdAt = new Date();

    if (shouldUseInMemoryStore()) {
      const record = {
        id: crypto.randomUUID(),
        token,
        email,
        redirectTo: redirectTo ?? null,
        userId: null,
        expiresAt,
        usedAt: null,
        createdAt,
      };

      inMemoryMagicLinks.set(token, record);
    } else {
      await prisma.magicLinkToken.create({
        data: {
          token,
          email,
          redirectTo: redirectTo ?? null,
          expiresAt,
        },
      });
    }

    const link = buildMagicLinkUrl(token, redirectTo);
    const delivered = await deliverMagicLinkEmail(email, link);

    return {
      delivered,
      link,
      token: process.env.NODE_ENV === 'test' ? token : null,
      expiresAt,
    };
  }

  async resolve(tokenValue) {
    if (!tokenValue) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const token = inMemoryMagicLinks.get(tokenValue);

      if (!token) {
        return null;
      }

      if (token.usedAt || token.expiresAt < new Date()) {
        inMemoryMagicLinks.delete(tokenValue);
        return null;
      }

      return token;
    }

    const token = await prisma.magicLinkToken.findUnique({
      where: { token: tokenValue },
    });

    if (!token) {
      return null;
    }

    if (token.usedAt || token.expiresAt < new Date()) {
      await prisma.magicLinkToken.update({
        where: { id: token.id },
        data: { usedAt: token.usedAt ?? new Date() },
      });
      return null;
    }

    return token;
  }

  async markAsUsed(tokenRecord, userId) {
    const usedAt = new Date();

    if (shouldUseInMemoryStore()) {
      if (!tokenRecord) {
        return null;
      }

      const record = {
        ...tokenRecord,
        usedAt,
        userId: userId ?? null,
      };

      inMemoryMagicLinks.set(record.token, record);
      return record;
    }

    return prisma.magicLinkToken.update({
      where: { id: tokenRecord.id },
      data: {
        usedAt,
        userId: userId ?? null,
      },
    });
  }
}

export default new MagicLinkService();
