// Uploadm.js
const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  type: { type: String, enum: ['Physical Book', 'E-Book'], required: true },
  title: { type: String, required: true },
  author: { type: String },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() { return this.type === 'E-Book'; },
    default: null
  },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Upload', UploadSchema);