const Bus = require('../models/busModel');

const createBus = async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const listBuses = async (req, res) => {
  try {
    const { routeId, operatorName, status, sort = 'plateNumber', page = 1, limit = 10 } = req.query;
    const query = {};
    if (routeId) query.routeId = routeId;
    if (operatorName) query.operatorName = new RegExp(operatorName, 'i');
    if (status) query.status = status;
    
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, lastUpdated] = await Promise.all([
      Bus.find(query).populate('routeId', 'code name origin destination').sort(sort).skip(skip).limit(Number(limit)),
      Bus.countDocuments(query),
      Bus.findOne(query).sort('-updatedAt').select('updatedAt _id'),
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

const getBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('routeId', 'code name origin destination');
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('routeId', 'code name origin destination');
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBus, listBuses, getBus, updateBus, deleteBus };


