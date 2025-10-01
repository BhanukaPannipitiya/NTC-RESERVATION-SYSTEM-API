const Joi = require('joi');

const pushLocationSchema = Joi.object({
  tripId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  busId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  speedKmph: Joi.number().min(0).max(200).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  recordedAt: Joi.date().iso().optional(),
});

const currentPositionsQuerySchema = Joi.object({
  busId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  tripId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  since: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
});

const validate = (schema, location = 'body') => (req, res, next) => {
  const target = location === 'query' ? req.query : req.body;
  const { error, value } = schema.validate(target, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ message: 'Validation error', details: error.details.map(d => d.message) });
  }
  if (location === 'query') req.query = value; else req.body = value;
  next();
};

module.exports = {
  validatePushLocation: validate(pushLocationSchema, 'body'),
  validateCurrentPositions: validate(currentPositionsQuerySchema, 'query'),
};
