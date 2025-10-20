import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../src/middlewares/auth.middleware.js';

describe('authenticateToken middleware', () => {
  const mockNext = jest.fn();
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, JWT_SECRET: 'segredo_teste' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 when the Authorization header is missing', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication token not provided.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 403 when jwt.verify throws an error', () => {
    const req = { headers: { authorization: 'Bearer invalid' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('invalid token');
    });

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired token.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when the token is valid', () => {
    const req = { headers: { authorization: 'Bearer valid' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const decodedUser = { id: 1, email: 'test@example.com' };

    jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser);

    authenticateToken(req, res, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('valid', process.env.JWT_SECRET);
    expect(req.user).toEqual(decodedUser);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
