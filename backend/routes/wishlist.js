const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  addToWishlistBySearch,
  getWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');

router.post('/add-by-search', authMiddleware, addToWishlistBySearch);
router.get('/view', authMiddleware, getWishlist);
router.delete('/remove', authMiddleware, removeFromWishlist);

module.exports = router;
