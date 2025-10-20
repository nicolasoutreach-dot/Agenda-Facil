import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './modules/users/routes/UserRoutes.js';
import authRoutes from './modules/auth/routes/AuthRoutes.js';
import serviceRoutes from './modules/services/routes/ServiceRoutes.js';
import schedulingRoutes from './modules/scheduling/routes/SchedulingRoutes.js';
import googlePassport from './modules/auth/google/passport.js';
import 'dotenv/config';

const app = express();

app.disable('x-powered-by');

const requestLoggerFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? '64kb';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
});

app.use(helmet());
app.use(morgan(requestLoggerFormat));
app.use('/api', apiLimiter);
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: requestBodyLimit,
    strict: true,
    type: ['application/json', 'text/json', 'application/vnd.api+json'],
  }),
);
app.use(
  express.urlencoded({
    extended: false,
    limit: requestBodyLimit,
    parameterLimit: Number(process.env.URL_ENCODED_PARAMETER_LIMIT ?? 50),
  }),
);
app.use(googlePassport.initialize());

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/scheduling', schedulingRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Agenda Facil Backend',
    environment: process.env.NODE_ENV ?? 'development',
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Resource not found',
    path: req.originalUrl,
  });
});

app.use((error, req, res, _next) => {
  console.error('Unhandled error:', error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const response = {
    message:
      status >= 500
        ? 'Internal server error'
        : error.message ?? 'Não foi possível processar a sua solicitação.',
  };

  if (error.code === 'VALIDATION_ERROR' && error.details) {
    response.details = error.details;
  }

  return res.status(status).json(response);
});

export default app;
