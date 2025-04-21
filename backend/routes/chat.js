const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { sendMessage, getMessages, searchUsers, getAvailableUsers, getChatPartners } = require('../controllers/chatController');
// Remove authenticateWebSocket import if not used
// const { authenticateWebSocket } = require('../controllers/chatController');

router.post('/send-message', authMiddleware, sendMessage);
router.get('/messages/:receiverId', authMiddleware, getMessages);
router.get('/search-users', authMiddleware, searchUsers);
router.get('/available-users', authMiddleware, getAvailableUsers);
router.get('/chat-partners', authMiddleware, getChatPartners);

// WebSocket upgrade (handled in server.js, can be removed if not needed)
// router.get('/ws', (req, res, next) => {
//   res.setHeader('Sec-WebSocket-Protocol', 'chat');
//   next();
// });

module.exports = router;