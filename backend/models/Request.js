const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Book Title
  author: { type: String },                // Optional Author
  type: { 
    type: String, 
    enum: ['Physical Book', 'E-Book', 'Physical/E-Book'], 
    default: 'Physical/E-Book' 
  },                                      // Request type
  image: { type: String, default: null },  // Optional Image
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Just ID
});

module.exports = mongoose.model('Request', RequestSchema);