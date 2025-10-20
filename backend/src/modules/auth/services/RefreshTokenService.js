import crypto from 'node:crypto';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';

const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
const TOKEN_BYTES = Number(process.env.REFRESH_TOKEN_BYTES ?? 48);

const inMemoryRefreshTokens = new Map();

function calculateExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function createTokenValue() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

class RefreshTokenService {
  async create(userId, userSnapshot = null) {
    const tokenValue = createTokenValue();
    const expiresAt = calculateExpiryDate();

    if (shouldUseInMemoryStore()) {
      const refreshToken = {
        id: crypto.randomUUID(),
        token: tokenValue,
        userId,
        expiresAt,
        createdAt: new Date(),
        revokedAt: null,
        user: userSnapshot,
      };

      inMemoryRefreshTokens.set(tokenValue, refreshToken);

      return {
        token: tokenValue,
        refreshToken,
        expiresAt,
      };
    }

    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: tokenValue,
        userId,
        expiresAt,
      },
    });

    return {
      token: tokenValue,
      refreshToken,
      expiresAt: refreshToken.expiresAt,
    };
  }

  async revoke(tokenValue) {
    if (shouldUseInMemoryStore()) {
      const existing = inMemoryRefreshTokens.get(tokenValue);

      if (existing) {
        existing.revokedAt = new Date();
        inMemoryRefreshTokens.set(tokenValue, existing);
      }

      return;
    }

    await prisma.refreshToken.updateMany({
      where: { token: tokenValue, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getValidToken(tokenValue) {
    if (!tokenValue) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const token = inMemoryRefreshTokens.get(tokenValue);

      if (!token) {
        return null;
      }

      if (token.revokedAt || token.expiresAt < new Date()) {
        inMemoryRefreshTokens.delete(tokenValue);
        return null;
      }

      return token;
    }

    const token = await prisma.refreshToken.findUnique({
      where: { token: tokenValue },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!token) {
      return null;
    }

    if (token.revokedAt || token.expiresAt < new Date()) {
      await this.revoke(tokenValue);
      return null;
    }

    return token;
  }

  async rotate(tokenValue) {
    const existingToken = await this.getValidToken(tokenValue);

    if (!existingToken) {
      return null;
    }

    await this.revoke(tokenValue);

    if (shouldUseInMemoryStore()) {
      const { token, refreshToken, expiresAt } = await this.create(
        existingToken.userId,
        existingToken.user,
      );

      return {
        token,
        refreshToken,
        expiresAt,
        user: existingToken.user,
      };
    }

    const { token, refreshToken, expiresAt } = await this.create(existingToken.userId);
    const user =
      existingToken.user ??
      (await prisma.user.findUnique({
        where: { id: existingToken.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      }));

    return {
      token,
      refreshToken,
      expiresAt,
      user,
    };
  }
}

export default new RefreshTokenService();
