const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stopId: { type: String, required: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sequence: { type: Number, required: true },
}, { _id: false });

const routeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  distanceKm: { type: Number },
  stops: { type: [stopSchema], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true });

routeSchema.index({ code: 1 });
routeSchema.index({ origin: 1, destination: 1 });

module.exports = mongoose.model('Route', routeSchema);


