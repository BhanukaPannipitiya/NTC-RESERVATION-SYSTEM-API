const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  operatorName: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
}, { timestamps: true });

tripSchema.index({ routeId: 1, startTime: 1 });
tripSchema.index({ busId: 1, startTime: 1 });

module.exports = mongoose.model('Trip', tripSchema);


