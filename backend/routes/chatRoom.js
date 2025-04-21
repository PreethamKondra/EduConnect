// backend/routes/chatRoom.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  deleteRoom,
  getRoomMessages,
  getAllRooms,
  searchRooms,
  getMyRooms,
  getCreatedRooms,
} = require('../controllers/chatRoomController');

router.use(authMiddleware);
router.post('/create', createRoom);
router.post('/join/:roomId', joinRoom);
router.post('/leave/:roomId', leaveRoom);
router.post('/message/:roomId', sendRoomMessage);
router.delete('/delete/:roomId', deleteRoom);
router.get('/messages/:roomId', getRoomMessages);
router.get('/all', getAllRooms);
router.get('/search', searchRooms);
router.get('/my-rooms', getMyRooms);
router.get('/created-rooms', getCreatedRooms);

module.exports = router;