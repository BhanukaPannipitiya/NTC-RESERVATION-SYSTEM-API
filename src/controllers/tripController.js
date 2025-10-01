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
    const { routeId, busId, operatorName, startFrom, startTo, status, sort = 'startTime', page = 1, limit = 10 } = req.query;
    const query = {};
    if (routeId) query.routeId = routeId;
    if (busId) query.busId = busId;
    if (operatorName) query.operatorName = new RegExp(operatorName, 'i');
    if (status) query.status = status;
    if (startFrom || startTo) {
      query.startTime = {};
      if (startFrom) query.startTime.$gte = new Date(startFrom);
      if (startTo) query.startTime.$lte = new Date(startTo);
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, lastUpdated] = await Promise.all([
      Trip.find(query).populate('routeId', 'code name origin destination').populate('busId', 'plateNumber operatorName').sort(sort).skip(skip).limit(Number(limit)),
      Trip.countDocuments(query),
      Trip.findOne(query).sort('-updatedAt').select('updatedAt _id'),
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

const getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('routeId', 'code name origin destination').populate('busId', 'plateNumber operatorName');
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('routeId', 'code name origin destination').populate('busId', 'plateNumber operatorName');
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

// Generate weekly schedule for a bus on a route
const generateSchedule = async (req, res) => {
  try {
    const { routeId, busId, operatorName, startDate, endDate, startTime, endTime, intervalHours = 2 } = req.body;
    
    // Parse start and end dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1]);
    
    const trips = [];
    const current = new Date(start);
    
    // Generate trips for each day in the date range
    while (current <= end) {
      let tripStartHour = startHour;
      
      // Generate multiple trips per day based on interval
      while (tripStartHour < endHour) {
        const tripStart = new Date(current);
        tripStart.setHours(tripStartHour, startMinute, 0, 0);
        
        const tripEnd = new Date(tripStart);
        tripEnd.setHours(endHour, endMinute, 0, 0);
        
        // Check for conflicts with existing trips
        const existingTrip = await Trip.findOne({
          busId,
          startTime: { $lt: tripEnd },
          endTime: { $gt: tripStart },
          status: { $ne: 'cancelled' }
        });
        
        if (!existingTrip) {
          trips.push({
            routeId,
            busId,
            operatorName,
            startTime: tripStart,
            endTime: tripEnd,
            status: 'scheduled'
          });
        }
        
        tripStartHour += intervalHours;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Bulk insert trips
    const createdTrips = await Trip.insertMany(trips);
    
    res.status(201).json({
      message: `Generated ${createdTrips.length} trips`,
      trips: createdTrips,
      dateRange: { startDate, endDate },
      schedule: { startTime, endTime, intervalHours }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { createTrip, listTrips, getTrip, updateTrip, deleteTrip, generateSchedule };


