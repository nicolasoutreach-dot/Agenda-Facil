import { Router } from 'express';
import SchedulingController from '../controllers/SchedulingController.js';
import { authenticateToken } from '../../../middlewares/auth.middleware.js';
import {
  createValidationMiddleware,
  emptyObjectSchema,
  createSchedulingCustomerSchema,
  createSchedulingServiceSchema,
  createWorkingHourSchema,
  updateWorkingHourSchema,
  workingHourIdParamSchema,
  createSchedulingAppointmentSchema,
  createSchedulingBlockSchema,
  blockIdParamSchema,
  createSchedulingPaymentSchema,
} from '../../../validation/index.js';

const router = Router();

const validateEmptyQuery = createValidationMiddleware(emptyObjectSchema, { target: 'query' });
const validateWorkingHourIdParam = createValidationMiddleware(workingHourIdParamSchema, {
  target: 'params',
});
const validateBlockIdParam = createValidationMiddleware(blockIdParamSchema, { target: 'params' });
const validateCreateWorkingHour = createValidationMiddleware(createWorkingHourSchema);
const validateUpdateWorkingHour = createValidationMiddleware(updateWorkingHourSchema);
const validateCreateBlock = createValidationMiddleware(createSchedulingBlockSchema);

router.get(
  '/overview',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.overview(req, res),
);

router.get(
  '/customers',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listCustomers(req, res),
);

router.post(
  '/customers',
  authenticateToken,
  createValidationMiddleware(createSchedulingCustomerSchema),
  (req, res) => SchedulingController.createCustomer(req, res),
);

router.get(
  '/services',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listServices(req, res),
);

router.post(
  '/services',
  authenticateToken,
  createValidationMiddleware(createSchedulingServiceSchema),
  (req, res) => SchedulingController.createService(req, res),
);

router.get(
  '/working-hours',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listWorkingHours(req, res),
);

router.post(
  '/working-hours',
  authenticateToken,
  validateCreateWorkingHour,
  (req, res) => SchedulingController.createWorkingHour(req, res),
);

router.put(
  '/working-hours/:id',
  authenticateToken,
  validateWorkingHourIdParam,
  validateUpdateWorkingHour,
  (req, res) => SchedulingController.updateWorkingHour(req, res),
);

router.delete(
  '/working-hours/:id',
  authenticateToken,
  validateWorkingHourIdParam,
  (req, res) => SchedulingController.removeWorkingHour(req, res),
);

router.get(
  '/blocks',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listBlocks(req, res),
);

router.post(
  '/blocks',
  authenticateToken,
  validateCreateBlock,
  (req, res) => SchedulingController.createBlock(req, res),
);

router.delete(
  '/blocks/:id',
  authenticateToken,
  validateBlockIdParam,
  (req, res) => SchedulingController.removeBlock(req, res),
);

router.get(
  '/appointments',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listAppointments(req, res),
);

router.post(
  '/appointments',
  authenticateToken,
  createValidationMiddleware(createSchedulingAppointmentSchema),
  (req, res) => SchedulingController.createAppointment(req, res),
);

router.get(
  '/payments',
  authenticateToken,
  validateEmptyQuery,
  (req, res) => SchedulingController.listPayments(req, res),
);

router.post(
  '/payments',
  authenticateToken,
  createValidationMiddleware(createSchedulingPaymentSchema),
  (req, res) => SchedulingController.recordPayment(req, res),
);

export default router;
