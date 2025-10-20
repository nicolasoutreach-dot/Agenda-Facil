import { Router } from 'express';
import ServiceController from '../controllers/ServiceController.js';
import { authenticateToken } from '../../../middlewares/auth.middleware.js';
import {
  createValidationMiddleware,
  emptyObjectSchema,
  createServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
} from '../../../validation/index.js';

const router = Router();

const validateEmptyQuery = createValidationMiddleware(emptyObjectSchema, { target: 'query' });
const validateServiceIdParam = createValidationMiddleware(serviceIdParamSchema, { target: 'params' });
const validateCreateService = createValidationMiddleware(createServiceSchema);
const validateUpdateService = createValidationMiddleware(updateServiceSchema);

router.get('/', authenticateToken, validateEmptyQuery, (req, res) => ServiceController.list(req, res));
router.post('/', authenticateToken, validateCreateService, (req, res) => ServiceController.create(req, res));
router.put(
  '/:id',
  authenticateToken,
  validateServiceIdParam,
  validateUpdateService,
  (req, res) => ServiceController.update(req, res),
);
router.delete(
  '/:id',
  authenticateToken,
  validateServiceIdParam,
  (req, res) => ServiceController.remove(req, res),
);

export default router;
