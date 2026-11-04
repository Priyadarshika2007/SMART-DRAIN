import { body, query, validationResult } from 'express-validator';

export const validateNoBodyForGet = [
  body().custom((_, { req }) => {
    if (req.method === 'GET' && req.body && Object.keys(req.body).length > 0) {
      throw new Error('GET requests must not include a request body');
    }
    return true;
  }),
];

export const validateDebugFlagQuery = [
  query('debug')
    .optional()
    .isBoolean()
    .withMessage('debug must be a boolean (true/false)'),
];

export const validateSensorPayload = [
  body('drain_id')
    .exists({ checkNull: true })
    .withMessage('drain_id is required')
    .bail()
    .custom((val) => {
      if (typeof val === 'number' || (typeof val === 'string' && val.trim().length > 0)) {
        return true;
      }
      throw new Error('drain_id must be a valid string or number');
    }),
  body('water_level_cm')
    .exists({ checkNull: true })
    .withMessage('water_level_cm is required')
    .bail()
    .isNumeric()
    .withMessage('water_level_cm must be a number'),
  body()
    .custom((payload) => {
      const flow = payload.flow_rate_l_min !== undefined ? payload.flow_rate_l_min : payload.flow_rate_lps;
      if (flow === undefined || flow === null || isNaN(Number(flow))) {
        throw new Error('Either flow_rate_l_min or flow_rate_lps must be a number');
      }
      return true;
    }),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
}
