import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import googleAuthRoutes from '../google/routes.js';
import { authenticateToken } from '../../../middlewares/auth.middleware.js';
import {
  createValidationMiddleware,
  forgotPasswordSchema,
  refreshTokenSchema,
  requestOtpSchema,
  requestMagicLinkSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  verifyMagicLinkSchema,
} from '../../../validation/index.js';

const router = Router();

router.use('/google', googleAuthRoutes);

const validateRequestOtp = createValidationMiddleware(requestOtpSchema);
const validateRequestMagicLink = createValidationMiddleware(requestMagicLinkSchema);
const validateVerifyMagicLink = createValidationMiddleware(verifyMagicLinkSchema);
const validateVerifyOtp = createValidationMiddleware(verifyOtpSchema);
const validateRefreshToken = createValidationMiddleware(refreshTokenSchema);
const validateForgotPassword = createValidationMiddleware(forgotPasswordSchema);
const validateResetPassword = createValidationMiddleware(resetPasswordSchema);

router.post('/request-otp', validateRequestOtp, (req, res) => AuthController.requestOtp(req, res));
router.post('/request-magic-link', validateRequestMagicLink, (req, res) =>
  AuthController.requestMagicLink(req, res),
);
router.post('/verify-otp', validateVerifyOtp, (req, res) => AuthController.verifyOtp(req, res));
router.post('/verify', validateVerifyMagicLink, (req, res) => AuthController.verifyMagicLink(req, res));
router.post('/refresh', validateRefreshToken, (req, res) => AuthController.refresh(req, res));
router.post('/forgot-password', validateForgotPassword, (req, res) => AuthController.forgotPassword(req, res));
router.post('/reset-password', validateResetPassword, (req, res) => AuthController.resetPassword(req, res));
router.post('/logout', validateRefreshToken, (req, res) => AuthController.logout(req, res));
router.get('/session', authenticateToken, (req, res) => AuthController.session(req, res));

export default router;
