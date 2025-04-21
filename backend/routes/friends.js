const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { searchUsers, toggleFriend, getFriendsList } = require('../controllers/friendController');

router.get('/search-users', authMiddleware, searchUsers);
router.post('/toggle', authMiddleware, toggleFriend); // Matches /friends/toggle
router.get('/list', authMiddleware, getFriendsList); // Matches /friends/list

module.exports = router;