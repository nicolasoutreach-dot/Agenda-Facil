import UserService from '../services/UserService.js';
import RefreshTokenService from '../../auth/services/RefreshTokenService.js';
import { ACCESS_TOKEN_TTL, signAccessToken } from '../../auth/utils/token.js';
import { setAuthCookies } from '../../auth/utils/cookies.js';

class UserController {
  async list(req, res) {
    try {
      const users = await UserService.findAll();
      return res.status(200).json({ users });
    } catch (error) {
      console.error('Failed to list users:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async create(req, res) {
    const payload = req.body ?? {};

    try {
      const newUser = await UserService.create(payload);
      return res.status(201).json({ user: newUser });
    } catch (error) {
      if (
        error.code === 'USER_ALREADY_EXISTS' ||
        error.code === 'P2002' ||
        error.code === 'USER_UNIQUE_CONSTRAINT_VIOLATION' ||
        error.code === 'USER_PHONE_ALREADY_EXISTS'
      ) {
        return res.status(409).json({ message: 'Email ou telefone ja em uso' });
      }

      console.error('Failed to create user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async login(req, res) {
    const payload = req.body ?? {};

    try {
      const user = await UserService.validateCredentials(payload.email, payload.password);

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const accessToken = signAccessToken(user);
      const { token: refreshToken, expiresAt } = await RefreshTokenService.create(user.id, user);
      setAuthCookies(res, {
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
        accessTokenTtl: ACCESS_TOKEN_TTL,
      });

      return res.status(200).json({
        token: accessToken,
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt.toISOString(),
        user,
      });
    } catch (error) {
      console.error('Failed to login:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async me(req, res) {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const user = await UserService.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Failed to load current user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateMe(req, res) {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const payload = req.body ?? {};
      const user = await UserService.update(userId, payload);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      if (
        error.code === 'USER_UNIQUE_CONSTRAINT_VIOLATION' ||
        error.code === 'P2002' ||
        error.code === 'USER_PHONE_ALREADY_EXISTS'
      ) {
        return res.status(409).json({ message: 'Email ou telefone ja em uso' });
      }

      console.error('Failed to update current user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  dashboard(req, res) {
    return res.status(200).json({
      message: `Welcome back, ${req.user?.email ?? 'user'}!`,
    });
  }

  async show(req, res) {
    const userId = req.params?.id;
    const sessionUserId = req.user?.sub;

    if (!sessionUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (sessionUserId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const user = await UserService.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Failed to load user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async update(req, res) {
    const userId = req.params?.id;
    const sessionUserId = req.user?.sub;

    if (!sessionUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (sessionUserId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const payload = req.body ?? {};
      const user = await UserService.update(userId, payload);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      if (
        error?.code === 'USER_ALREADY_EXISTS' ||
        error?.code === 'P2002' ||
        error?.code === 'USER_UNIQUE_CONSTRAINT_VIOLATION' ||
        error?.code === 'USER_PHONE_ALREADY_EXISTS'
      ) {
        return res.status(409).json({ message: 'Email ou telefone ja em uso' });
      }

      console.error('Failed to update user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async remove(req, res) {
    const userId = req.params?.id;
    const sessionUserId = req.user?.sub;

    if (!sessionUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (sessionUserId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const deleted = await UserService.delete(userId);

      if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Failed to delete user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async completeOnboarding(req, res) {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const payload = req.body ?? {};
      const user = await UserService.completeOnboarding(userId, payload);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user, shouldCompleteOnboarding: false });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new UserController();
