import passport from 'passport';
import buildGoogleStrategy from './strategy.js';

const googleStrategy = buildGoogleStrategy();

if (googleStrategy) {
  passport.use('google', googleStrategy);
}

export default passport;
