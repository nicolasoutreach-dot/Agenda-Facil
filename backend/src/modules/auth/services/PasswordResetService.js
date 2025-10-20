import crypto from 'node:crypto';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';
import UserService from '../../users/services/UserService.js';

const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 60);
const RESET_TOKEN_BYTES = Number(process.env.PASSWORD_RESET_TOKEN_BYTES ?? 32);

const inMemoryResetTokens = new Map();

function calculateResetExpiry() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

function createResetTokenValue() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

class PasswordResetService {
  async request(email) {
    const user = await UserService.findByEmail(email);

    if (!user) {
      return { delivered: false, token: null };
    }

    const token = createResetTokenValue();
    const expiresAt = calculateResetExpiry();

    if (shouldUseInMemoryStore()) {
      inMemoryResetTokens.set(token, {
        id: crypto.randomUUID(),
        token,
        userId: user.id,
        email: user.email,
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
      });

      return { delivered: true, token };
    }

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    return { delivered: true, token };
  }

  async resolveToken(tokenValue) {
    if (!tokenValue) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const token = inMemoryResetTokens.get(tokenValue);

      if (!token) {
        return null;
      }

      if (token.usedAt || token.expiresAt < new Date()) {
        inMemoryResetTokens.delete(tokenValue);
        return null;
      }

      return token;
    }

    const token = await prisma.passwordResetToken.findUnique({
      where: { token: tokenValue },
    });

    if (!token) {
      return null;
    }

    if (token.usedAt || token.expiresAt < new Date()) {
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: token.usedAt ?? new Date() },
      });
      return null;
    }

    return token;
  }

  async resetPassword(tokenValue, newPassword) {
    const token = await this.resolveToken(tokenValue);

    if (!token) {
      return null;
    }

    const updatedUser = await UserService.updatePassword(token.userId, newPassword);

    if (shouldUseInMemoryStore()) {
      const existing = inMemoryResetTokens.get(tokenValue);
      if (existing) {
        existing.usedAt = new Date();
        inMemoryResetTokens.set(tokenValue, existing);
      }
      return updatedUser;
    }

    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return updatedUser;
  }
}

export default new PasswordResetService();
