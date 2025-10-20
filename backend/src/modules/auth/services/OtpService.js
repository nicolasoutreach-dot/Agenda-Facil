import crypto from 'node:crypto';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

const DEFAULT_OTP_TTL_SECONDS = (() => {
  const seconds = parsePositiveNumber(process.env.OTP_TTL_SECONDS, null);
  if (seconds !== null) {
    return seconds;
  }

  const minutes = parsePositiveNumber(process.env.OTP_TTL_MINUTES, null);
  if (minutes !== null) {
    return minutes * 60;
  }

  return 300;
})();

const DEFAULT_OTP_LENGTH = parsePositiveNumber(process.env.OTP_LENGTH, 6);
const OTP_DELIVERY_STRATEGY = process.env.OTP_DELIVERY_STRATEGY?.toLowerCase() ?? 'console';
const NORMALIZED_OTP_LENGTH = Math.min(12, Math.max(4, Math.floor(DEFAULT_OTP_LENGTH)));

const inMemoryOtpByEmail = new Map();

function calculateOtpExpiry() {
  return new Date(Date.now() + DEFAULT_OTP_TTL_SECONDS * 1000);
}

function generateNumericOtp() {
  const max = 10 ** NORMALIZED_OTP_LENGTH;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(NORMALIZED_OTP_LENGTH, '0');
}

async function deliverOtp(email, code) {
  if (OTP_DELIVERY_STRATEGY === 'console') {
    console.info(`[OTP] Sending one-time passcode to ${email}: ${code}`);
    return true;
  }

  if (OTP_DELIVERY_STRATEGY === 'noop') {
    return false;
  }

  console.warn(
    `Unsupported OTP delivery strategy "${OTP_DELIVERY_STRATEGY}". Defaulting to no delivery.`,
  );
  return false;
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

function normalizeCode(code) {
  if (typeof code !== 'string') {
    return '';
  }
  return code.trim();
}

class OtpService {
  async request(rawEmail) {
    const email = normalizeEmail(rawEmail);

    if (!email) {
      throw new Error('Invalid email provided for OTP request');
    }

    const code = generateNumericOtp();
    const expiresAt = calculateOtpExpiry();
    const createdAt = new Date();

    if (shouldUseInMemoryStore()) {
      const record = {
        id: crypto.randomUUID(),
        email,
        code,
        expiresAt,
        createdAt,
        usedAt: null,
        userId: null,
      };

      inMemoryOtpByEmail.set(email, record);
    } else {
      await prisma.otpToken.deleteMany({
        where: { email },
      });

      await prisma.otpToken.create({
        data: {
          email,
          code,
          expiresAt,
        },
      });
    }

    const delivered = await deliverOtp(email, code);

    return {
      delivered,
      code: process.env.NODE_ENV === 'test' ? code : null,
      expiresAt,
    };
  }

  async verify(rawEmail, rawCode) {
    const email = normalizeEmail(rawEmail);
    const code = normalizeCode(rawCode);

    if (!email || !code) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const record = inMemoryOtpByEmail.get(email);

      if (!record) {
        return null;
      }

      if (record.usedAt || record.expiresAt < new Date()) {
        inMemoryOtpByEmail.delete(email);
        return null;
      }

      if (record.code !== code) {
        return null;
      }

      return record;
    }

    const record = await prisma.otpToken.findFirst({
      where: {
        email,
        code,
      },
    });

    if (!record) {
      return null;
    }

    if (record.usedAt || record.expiresAt < new Date()) {
      if (!record.usedAt) {
        await prisma.otpToken.update({
          where: { id: record.id },
          data: { usedAt: record.usedAt ?? new Date() },
        });
      }
      return null;
    }

    return record;
  }

  async markAsUsed(record, userId = null) {
    if (!record) {
      return null;
    }

    const usedAt = new Date();

    if (shouldUseInMemoryStore()) {
      const current = inMemoryOtpByEmail.get(record.email);

      if (!current) {
        return null;
      }

      const updated = {
        ...current,
        usedAt,
        userId: userId ?? null,
      };

      inMemoryOtpByEmail.set(record.email, updated);
      return updated;
    }

    return prisma.otpToken.update({
      where: { id: record.id },
      data: {
        usedAt,
        userId: userId ?? null,
      },
    });
  }

  async clearPendingForEmail(rawEmail) {
    const email = normalizeEmail(rawEmail);

    if (!email) {
      return;
    }

    if (shouldUseInMemoryStore()) {
      inMemoryOtpByEmail.delete(email);
      return;
    }

    await prisma.otpToken.deleteMany({
      where: { email },
    });
  }
}

export default new OtpService();
