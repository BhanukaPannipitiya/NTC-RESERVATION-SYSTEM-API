const Route = require('../models/routeModel');

// Create Route
const createRoute = async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// List Routes with filters, sort, pagination
const listRoutes = async (req, res) => {
  try {
    const { search, origin, destination, active, sort = 'code', page = 1, limit = 10 } = req.query;
    const query = {};
    if (origin) query.origin = new RegExp(origin, 'i');
    if (destination) query.destination = new RegExp(destination, 'i');
    if (active !== undefined) query.active = active === 'true';
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, lastUpdated] = await Promise.all([
      Route.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Route.countDocuments(query),
      Route.findOne(query).sort('-updatedAt').select('updatedAt _id'),
    ]);

    const lastModified = lastUpdated?.updatedAt ? new Date(lastUpdated.updatedAt).toUTCString() : undefined;
    if (lastModified) {
      res.set('Last-Modified', lastModified);
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModified)) {
        return res.status(304).send();
      }
    }

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Route by id
const getRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Route
const updateRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete Route
const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRoute, listRoutes, getRoute, updateRoute, deleteRoute };


