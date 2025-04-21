const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true }
  }]
});

module.exports = mongoose.model('Wishlist', WishlistSchema);