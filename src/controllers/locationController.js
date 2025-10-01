const Location = require('../models/locationModel');

// Operator pushes a new location update
const pushLocation = async (req, res) => {
  try {
    const location = await Location.create(req.body);
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Current positions by route or bus (last known per bus)
const currentPositions = async (req, res) => {
  try {
    const { busId, tripId } = req.query;
    const query = {};
    if (busId) query.busId = busId;
    if (tripId) query.tripId = tripId;

    const items = await Location.find(query).sort('-recordedAt').limit(100);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { pushLocation, currentPositions };


