import { Router } from 'express';
import GoogleAuthController from './controller.js';

const router = Router();

router.get('/', (req, res, next) => GoogleAuthController.initiate(req, res, next));
router.get('/callback', (req, res, next) => GoogleAuthController.callback(req, res, next));

export default router;
