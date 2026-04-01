import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /secret/gi,
  /key/gi,
  /authorization/gi,
  /database_url/gi,
];

export function redactSensitiveValue(value) {
  if (typeof value !== 'string') return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function redactSecretsInObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(clone)) {
    const shouldRedact = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    if (shouldRedact) {
      clone[key] = '***REDACTED***';
      continue;
    }
    if (clone[key] && typeof clone[key] === 'object') {
      clone[key] = redactSecretsInObject(clone[key]);
    }
  }

  return clone;
}

export function safeLog(label, details = {}) {
  const safeDetails = redactSecretsInObject(details);
  console.log(label, safeDetails);
}

export const secureHeaders = helmet({
  contentSecurityPolicy: false,
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    const allowedOrigin = process.env.FRONTEND_URL;

    if (!allowedOrigin) {
      const err = new Error('FRONTEND_URL is not configured');
      err.status = 500;
      return callback(err);
    }

    if (!origin || origin === allowedOrigin) {
      return callback(null, true);
    }

    const err = new Error('CORS policy: This origin is not allowed');
    err.status = 403;
    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
