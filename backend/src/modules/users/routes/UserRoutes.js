import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { authenticateToken } from '../../../middlewares/auth.middleware.js';
import {
  createValidationMiddleware,
  emptyObjectSchema,
  loginSchema,
  registerSchema,
  completeOnboardingSchema,
  userIdParamSchema,
  updateUserSchema,
} from '../../../validation/index.js';

const router = Router();

const validateRegister = createValidationMiddleware(registerSchema);
const validateLogin = createValidationMiddleware(loginSchema);
const validateEmptyQuery = createValidationMiddleware(emptyObjectSchema, { target: 'query' });
const validateCompleteOnboarding = createValidationMiddleware(completeOnboardingSchema);
const validateUserIdParam = createValidationMiddleware(userIdParamSchema, { target: 'params' });
const validateUpdateUser = createValidationMiddleware(updateUserSchema);

router.get('/', authenticateToken, validateEmptyQuery, (req, res) => UserController.list(req, res));

router.post('/', validateRegister, (req, res) => UserController.create(req, res));
router.post('/register', validateRegister, (req, res) => UserController.create(req, res));

router.post('/login', validateLogin, (req, res) => UserController.login(req, res));

router.get('/me', authenticateToken, (req, res) => UserController.me(req, res));
router.put('/me', authenticateToken, validateUpdateUser, (req, res) => UserController.updateMe(req, res));
router.patch('/me', authenticateToken, validateUpdateUser, (req, res) => UserController.updateMe(req, res));
router.get('/dashboard', authenticateToken, (req, res) => UserController.dashboard(req, res));
router.post(
  '/onboarding/complete',
  authenticateToken,
  validateCompleteOnboarding,
  (req, res) => UserController.completeOnboarding(req, res),
);

router.get('/:id', authenticateToken, validateUserIdParam, (req, res) => UserController.show(req, res));
router.put(
  '/:id',
  authenticateToken,
  validateUserIdParam,
  validateUpdateUser,
  (req, res) => UserController.update(req, res),
);
router.delete('/:id', authenticateToken, validateUserIdParam, (req, res) => UserController.remove(req, res));

export default router;
