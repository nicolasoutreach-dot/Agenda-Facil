import jwt from 'jsonwebtoken';
import { getAccessTokenFromRequest } from '../modules/auth/utils/cookies.js';
import { getJwtSecret } from '../modules/auth/utils/token.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers?.authorization ?? req.headers?.Authorization;

  const [scheme, rawToken] = (authHeader ?? '').split(' ');
  let token = scheme?.toLowerCase() === 'bearer' ? rawToken : authHeader;

  if (!token) {
    token = getAccessTokenFromRequest(req);
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (_error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

export default authenticateToken;
