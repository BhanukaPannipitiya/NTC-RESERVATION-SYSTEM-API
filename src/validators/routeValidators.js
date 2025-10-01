const Joi = require('joi');

const stopSchema = Joi.object({
  stopId: Joi.string().required(),
  name: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  sequence: Joi.number().integer().required(),
});

const createRouteSchema = Joi.object({
  code: Joi.string().trim().max(20).required(),
  name: Joi.string().trim().max(100).required(),
  origin: Joi.string().trim().required(),
  destination: Joi.string().trim().required(),
  distanceKm: Joi.number().min(0).optional(),
  stops: Joi.array().items(stopSchema).default([]),
  active: Joi.boolean().default(true),
});

const updateRouteSchema = createRouteSchema.fork(
  ['code', 'name', 'origin', 'destination'],
  (schema) => schema.optional()
);

const listQuerySchema = Joi.object({
  search: Joi.string().allow('').optional(),
  origin: Joi.string().optional(),
  destination: Joi.string().optional(),
  active: Joi.string().valid('true', 'false').optional(),
  sort: Joi.string().valid('code', 'name', 'origin', 'destination', '-code', '-name').default('code'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
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
  validateCreateRoute: validate(createRouteSchema, 'body'),
  validateUpdateRoute: validate(updateRouteSchema, 'body'),
  validateListRoutes: validate(listQuerySchema, 'query'),
};


