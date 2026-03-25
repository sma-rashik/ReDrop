const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  lastDonation: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  coordinates: { type: [Number], default: [] }
}, { timestamps: true });

UserSchema.index({ phone: 1 });

module.exports = mongoose.model('User', UserSchema);
