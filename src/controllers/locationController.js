const Location = require('../models/locationModel');
const Trip = require('../models/tripModel');
const Bus = require('../models/busModel');

// Operator pushes a new location update
const pushLocation = async (req, res) => {
  try {
    const { tripId, busId, latitude, longitude, speedKmph, heading, recordedAt } = req.body;
    
    // Verify trip exists and is active
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    // Verify bus exists and matches trip
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    
    if (trip.busId.toString() !== busId) {
      return res.status(400).json({ message: 'Bus does not match trip' });
    }
    
    // Create location update
    const locationData = {
      tripId,
      busId,
      latitude,
      longitude,
      speedKmph,
      heading,
      recordedAt: recordedAt || new Date()
    };
    
    const location = await Location.create(locationData);
    
    // Update trip status to ongoing if it's scheduled
    if (trip.status === 'scheduled') {
      await Trip.findByIdAndUpdate(tripId, { status: 'ongoing' });
    }
    
    res.status(201).json({
      message: 'Location updated successfully',
      location: {
        _id: location._id,
        tripId: location.tripId,
        busId: location.busId,
        latitude: location.latitude,
        longitude: location.longitude,
        speedKmph: location.speedKmph,
        heading: location.heading,
        recordedAt: location.recordedAt
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Current positions by route, bus, or trip (last known per bus)
const currentPositions = async (req, res) => {
  try {
    const { busId, tripId, routeId, since, limit = 100 } = req.query;
    const query = {};
    
    if (busId) query.busId = busId;
    if (tripId) query.tripId = tripId;
    if (since) query.recordedAt = { $gte: new Date(since) };
    
    // If filtering by route, get all trips for that route
    if (routeId) {
      const trips = await Trip.find({ routeId }).select('_id');
      const tripIds = trips.map(trip => trip._id);
      query.tripId = { $in: tripIds };
    }
    
    // Get latest location for each bus
    const pipeline = [
      { $match: query },
      { $sort: { recordedAt: -1 } },
      {
        $group: {
          _id: '$busId',
          latestLocation: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestLocation' } },
      { $sort: { recordedAt: -1 } },
      { $limit: parseInt(limit) }
    ];
    
    const items = await Location.aggregate(pipeline);
    
    // Populate trip and bus details
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const trip = await Trip.findById(item.tripId).populate('routeId', 'code name origin destination');
        const bus = await Bus.findById(item.busId).select('plateNumber operatorName');
        
        return {
          ...item,
          trip: trip ? {
            _id: trip._id,
            status: trip.status,
            startTime: trip.startTime,
            endTime: trip.endTime,
            route: trip.routeId
          } : null,
          bus: bus ? {
            _id: bus._id,
            plateNumber: bus.plateNumber,
            operatorName: bus.operatorName
          } : null
        };
      })
    );
    
    res.json({ 
      items: populatedItems,
      count: populatedItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get location history for a specific bus or trip
const getLocationHistory = async (req, res) => {
  try {
    const { busId, tripId, startTime, endTime, limit = 1000 } = req.query;
    const query = {};
    
    if (busId) query.busId = busId;
    if (tripId) query.tripId = tripId;
    if (startTime || endTime) {
      query.recordedAt = {};
      if (startTime) query.recordedAt.$gte = new Date(startTime);
      if (endTime) query.recordedAt.$lte = new Date(endTime);
    }
    
    const items = await Location.find(query)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ 
      items,
      count: items.length,
      query: { busId, tripId, startTime, endTime }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { pushLocation, currentPositions, getLocationHistory };


