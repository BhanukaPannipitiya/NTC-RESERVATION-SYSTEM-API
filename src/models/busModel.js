const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true },
  capacity: { type: Number, default: 50 },
  operatorName: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
}, { timestamps: true });

busSchema.index({ routeId: 1 });
busSchema.index({ operatorName: 1 });

module.exports = mongoose.model('Bus', busSchema);


