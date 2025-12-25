const mongoose = require('mongoose');

const publicKeySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  publicKey: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const PublicKey = mongoose.model('PublicKey', publicKeySchema, 'public key');

module.exports = PublicKey;
