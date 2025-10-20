import RefreshTokenService from '../services/RefreshTokenService.js';
import PasswordResetService from '../services/PasswordResetService.js';
import MagicLinkService from '../services/MagicLinkService.js';
import OtpService from '../services/OtpService.js';
import { ACCESS_TOKEN_TTL, signAccessToken } from '../utils/token.js';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from '../utils/cookies.js';
import UserService from '../../users/services/UserService.js';

async function issueAuthSuccessResponse(res, user, { requestedRedirect } = {}) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, expiresAt } = await RefreshTokenService.create(user.id, user);
  const onboardingRedirect = process.env.ONBOARDING_REDIRECT_URL ?? '/onboarding';
  const defaultDashboardRedirect = process.env.DEFAULT_DASHBOARD_REDIRECT_URL ?? '/dashboard';
  const shouldCompleteOnboarding = Boolean(user.onboardingIncompleto);
  const nextRedirect = shouldCompleteOnboarding
    ? onboardingRedirect
    : requestedRedirect ?? defaultDashboardRedirect;

  setAuthCookies(res, {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    accessTokenTtl: ACCESS_TOKEN_TTL,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
    accessTokenTtl: ACCESS_TOKEN_TTL,
    user,
    shouldCompleteOnboarding,
    requestedRedirect: requestedRedirect ?? null,
    nextRedirect,
  };
}

class AuthController {
  async requestOtp(req, res) {
    const payload = req.body ?? {};

    try {
      const result = await OtpService.request(payload.email);
      const responseBody = {
        message: 'If the email is valid, an access code will be sent shortly.',
        delivered: result.delivered,
      };

      if (process.env.NODE_ENV === 'test' && result.code) {
        responseBody.otp = result.code;
      }

      return res.status(202).json(responseBody);
    } catch (error) {
      console.error('Failed to request OTP:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async requestMagicLink(req, res) {
    const payload = req.body ?? {};

    try {
      const result = await MagicLinkService.request(payload.email, {
        redirectTo: payload.redirectTo,
      });

      const responseBody = {
        message: 'If the email is valid, a sign-in link will be sent shortly.',
        delivered: result.delivered,
      };

      if (process.env.NODE_ENV === 'test' && result.token) {
        responseBody.magicLinkToken = result.token;
        responseBody.magicLinkUrl = result.link;
      }

      return res.status(202).json(responseBody);
    } catch (error) {
      console.error('Failed to request magic link:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async verifyMagicLink(req, res) {
    const payload = req.body ?? {};

    try {
      const tokenRecord = await MagicLinkService.resolve(payload.token);

      if (!tokenRecord) {
        return res.status(400).json({ message: 'Invalid or expired magic link token' });
      }

      const user = await UserService.ensureUserForEmail(tokenRecord.email);

      await MagicLinkService.markAsUsed(tokenRecord, user.id);

      const authPayload = await issueAuthSuccessResponse(res, user, {
        requestedRedirect: tokenRecord.redirectTo ?? null,
      });

      return res.status(200).json(authPayload);
    } catch (error) {
      console.error('Failed to verify magic link token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async verifyOtp(req, res) {
    const payload = req.body ?? {};

    try {
      if (payload.token) {
        const tokenRecord = await MagicLinkService.resolve(payload.token);

        if (!tokenRecord) {
          return res.status(400).json({ message: 'Invalid or expired magic link token' });
        }

        const user = await UserService.ensureUserForEmail(tokenRecord.email);

        await MagicLinkService.markAsUsed(tokenRecord, user.id);

        const authPayload = await issueAuthSuccessResponse(res, user, {
          requestedRedirect: tokenRecord.redirectTo ?? null,
        });

        return res.status(200).json(authPayload);
      }

      const otpRecord = await OtpService.verify(payload.email, payload.otp ?? payload.code);

      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP code' });
      }

      const user = await UserService.ensureUserForEmail(otpRecord.email);

      await OtpService.markAsUsed(otpRecord, user.id);

      const authPayload = await issueAuthSuccessResponse(res, user, {
        requestedRedirect: null,
      });

      return res.status(200).json(authPayload);
    } catch (error) {
      console.error('Failed to verify OTP code:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async refresh(req, res) {
    let bodyToken = null;
    const payload = req.body ?? {};

    bodyToken = payload.refreshToken ?? null;
    const effectiveRefreshToken = getRefreshTokenFromRequest(req, bodyToken);

    if (!effectiveRefreshToken) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    try {
      const rotation = await RefreshTokenService.rotate(effectiveRefreshToken);

      if (!rotation || !rotation.user) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }

      const accessToken = signAccessToken(rotation.user);
      setAuthCookies(res, {
        accessToken,
        refreshToken: rotation.token,
        refreshTokenExpiresAt: rotation.expiresAt,
        accessTokenTtl: ACCESS_TOKEN_TTL,
      });

      return res.status(200).json({
        token: accessToken,
        accessToken,
        refreshToken: rotation.token,
        refreshTokenExpiresAt: rotation.expiresAt.toISOString(),
        accessTokenTtl: ACCESS_TOKEN_TTL,
        user: rotation.user,
      });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async forgotPassword(req, res) {
    const payload = req.body ?? {};

    try {
      const result = await PasswordResetService.request(payload.email);
      const responseBody = {
        message: 'If an account exists for this email, a reset link will be sent shortly.',
        delivered: result.delivered,
      };

      if (process.env.NODE_ENV === 'test' && result.token) {
        responseBody.resetToken = result.token;
      }

      return res.status(202).json(responseBody);
    } catch (error) {
      console.error('Failed to start password recovery flow:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async resetPassword(req, res) {
    const payload = req.body ?? {};

    try {
      const updatedUser = await PasswordResetService.resetPassword(payload.token, payload.password);

      if (!updatedUser) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      return res
        .status(200)
        .json({
          message: 'Password updated successfully. You can now log in with the new password.',
        });
    } catch (error) {
      console.error('Failed to reset password:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req, req.body?.refreshToken);

      if (refreshToken) {
        await RefreshTokenService.revoke(refreshToken);
      }
    } catch (error) {
      console.error('Failed to revoke refresh token during logout:', error);
    } finally {
      clearAuthCookies(res);
    }

    return res.status(204).end();
  }

  async session(req, res) {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const user = await UserService.findByEmail(req.user.email);

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Failed to load session data:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new AuthController();
