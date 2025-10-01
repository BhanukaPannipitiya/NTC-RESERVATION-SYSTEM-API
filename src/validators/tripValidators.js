const Joi = require('joi');

const createTripSchema = Joi.object({
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  busId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  operatorName: Joi.string().trim().max(100).required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled').default('scheduled'),
});

const updateTripSchema = createTripSchema.fork(
  ['routeId', 'busId', 'operatorName'],
  (schema) => schema.optional()
);

const listQuerySchema = Joi.object({
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  busId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  operatorName: Joi.string().optional(),
  startFrom: Joi.date().iso().optional(),
  startTo: Joi.date().iso().optional(),
  status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled').optional(),
  sort: Joi.string().valid('startTime', 'endTime', '-startTime', '-endTime').default('startTime'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const generateScheduleSchema = Joi.object({
  routeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  busId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  operatorName: Joi.string().trim().max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  intervalHours: Joi.number().min(1).max(24).default(2),
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
  validateCreateTrip: validate(createTripSchema, 'body'),
  validateUpdateTrip: validate(updateTripSchema, 'body'),
  validateListTrips: validate(listQuerySchema, 'query'),
  validateGenerateSchedule: validate(generateScheduleSchema, 'body'),
};
