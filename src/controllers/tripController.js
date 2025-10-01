const Trip = require('../models/tripModel');

const createTrip = async (req, res) => {
  try {
    const trip = await Trip.create(req.body);
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const listTrips = async (req, res) => {
  try {
    const { routeId, busId, operatorName, startFrom, startTo, page = 1, limit = 10 } = req.query;
    const query = {};
    if (routeId) query.routeId = routeId;
    if (busId) query.busId = busId;
    if (operatorName) query.operatorName = new RegExp(operatorName, 'i');
    if (startFrom || startTo) {
      query.startTime = {};
      if (startFrom) query.startTime.$gte = new Date(startFrom);
      if (startTo) query.startTime.$lte = new Date(startTo);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Trip.find(query).sort('startTime').skip(skip).limit(Number(limit));
    const total = await Trip.countDocuments(query);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createTrip, listTrips, getTrip, updateTrip, deleteTrip };


