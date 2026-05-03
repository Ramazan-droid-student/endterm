const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ticker: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Stock', stockSchema);