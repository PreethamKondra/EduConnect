const express = require('express');
const router = express.Router();
const {
  upload,
  getAllRequests,
  getMyRequests,
  requestBook,
  deleteRequest
} = require('../controllers/requestController');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/all', authMiddleware, getAllRequests);          // All requests (with user info)
router.get('/mine', authMiddleware, getMyRequests);          // Only user's own requests
router.post('/add', authMiddleware, upload.single('image'), requestBook);
router.delete('/delete/:id', authMiddleware, deleteRequest);
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const requests = await require('../models/Request').find({
      $or: [{ title: searchRegex }, { author: searchRegex }],
    })
      .populate('user', 'name email year')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Error searching requests:', error);
    res.status(500).json({ success: false, message: 'Server error searching requests' });
  }
});

module.exports = router;