const Joi = require('joi');

const createBusSchema = Joi.object({
  plateNumber: Joi.string().trim().max(20).required(),
  capacity: Joi.number().integer().min(1).max(100).default(50),
  operatorName: Joi.string().trim().max(100).required(),
  status: Joi.string().valid('active', 'inactive', 'maintenance').default('active'),
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
});

const updateBusSchema = createBusSchema.fork(
  ['plateNumber', 'operatorName'],
  (schema) => schema.optional()
);

const listQuerySchema = Joi.object({
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  operatorName: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
  sort: Joi.string().valid('plateNumber', 'operatorName', 'status', '-plateNumber', '-operatorName').default('plateNumber'),
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
  validateCreateBus: validate(createBusSchema, 'body'),
  validateUpdateBus: validate(updateBusSchema, 'body'),
  validateListBuses: validate(listQuerySchema, 'query'),
};
