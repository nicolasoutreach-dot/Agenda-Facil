import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import UserService from '../../users/services/UserService.js';
import RefreshTokenService from '../services/RefreshTokenService.js';
import { signAccessToken } from '../utils/token.js';

dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/v1/auth/google/callback',
} = process.env;

function buildGoogleStrategy() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not configured. Google login will be unavailable.');
    return null;
  }

  return new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName ?? profile.name?.givenName ?? 'Usuário Google';
        const googleId = profile.id;

        if (!email) {
          return done(new Error('Google profile does not include an email address.'));
        }

        let user = await UserService.findByEmail(email);

        if (!user) {
          user = await UserService.create({
            name,
            email,
            password: `google-oauth-${googleId}`,
          });
        }

        const accessToken = signAccessToken(user);
        const { token: refreshToken, expiresAt } = await RefreshTokenService.create(user.id, user);

        return done(null, {
          user,
          tokens: {
            accessToken,
            refreshToken,
            refreshTokenExpiresAt: expiresAt,
          },
        });
      } catch (error) {
        console.error('Google OAuth strategy failed:', error);
        return done(error);
      }
    },
  );
}

export default buildGoogleStrategy;
