import dotenv from 'dotenv';
import passport from './passport.js';
import { ACCESS_TOKEN_TTL } from '../utils/token.js';
import { setAuthCookies } from '../utils/cookies.js';

dotenv.config();

const {
  GOOGLE_SUCCESS_REDIRECT = 'http://localhost:3001/dashboard',
  GOOGLE_FAILURE_REDIRECT = 'http://localhost:3001/login?error=google_oauth_failed',
} = process.env;

class GoogleAuthController {
  initiate(req, res, next) {
    const state = req.query.state ? String(req.query.state) : undefined;

    const authenticator = passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      prompt: 'select_account',
      state,
    });

    authenticator(req, res, next);
  }

  callback(req, res, next) {
    passport.authenticate(
      'google',
      { session: false },
      (error, result) => {
        if (error || !result) {
          console.error('Google OAuth callback error:', error);

          if (req.accepts('json')) {
            return res.status(500).json({ message: 'Failed to authenticate with Google.' });
          }

          return res.redirect(GOOGLE_FAILURE_REDIRECT);
        }

        const { user, tokens } = result;
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        const stateFragments = state ? state.split('|') : [];
        const normalizedFragments = stateFragments.map((fragment) => fragment.toLowerCase());

        let wantsJsonResponse = normalizedFragments.includes('json');
        let redirectTarget = GOOGLE_SUCCESS_REDIRECT;

        const successUrl = (() => {
          try {
            return new URL(GOOGLE_SUCCESS_REDIRECT);
          } catch {
            return null;
          }
        })();

        for (let index = 0; index < stateFragments.length; index += 1) {
          const fragment = stateFragments[index];
          const normalized = normalizedFragments[index];

          if (normalized.startsWith('redirect:')) {
            const candidate = decodeURIComponent(fragment.slice('redirect:'.length));
            if (candidate.startsWith('/')) {
              if (successUrl) {
                redirectTarget = `${successUrl.origin}${candidate}`;
              } else {
                redirectTarget = candidate;
              }
            } else if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
              redirectTarget = candidate;
            }
          }
        }
        const refreshTokenExpiresAt =
          tokens.refreshTokenExpiresAt instanceof Date
            ? tokens.refreshTokenExpiresAt.toISOString()
            : new Date(tokens.refreshTokenExpiresAt).toISOString();

        setAuthCookies(res, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          refreshTokenExpiresAt,
          accessTokenTtl: ACCESS_TOKEN_TTL,
        });

        if (wantsJsonResponse || req.accepts('json')) {
          return res.status(200).json({
            message: 'Authenticated with Google successfully.',
            user,
            tokens: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              refreshTokenExpiresAt,
            },
          });
        }

        const searchParams = new URLSearchParams({
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          refreshTokenExpiresAt,
        });

        return res.redirect(`${redirectTarget}?${searchParams.toString()}`);
      },
    )(req, res, next);
  }
}

export default new GoogleAuthController();
