const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speedKmph: { type: Number },
  heading: { type: Number },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

locationSchema.index({ tripId: 1, recordedAt: -1 });
locationSchema.index({ busId: 1, recordedAt: -1 });

module.exports = mongoose.model('Location', locationSchema);


