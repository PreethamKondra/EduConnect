require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { GridFSBucket, ObjectId } = require('mongodb');
const authMiddleware = require('./middleware/authMiddleware');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const requestRoutes = require('./routes/request');
const wishlistRoutes = require('./routes/wishlist');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const chatRoomRoutes = require('./routes/chatRoom');
const quizRoutes = require('./routes/quiz');
const User = require('./models/User');

//const dataRoutes = require('./routes/data'); // Add this line

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/chat/ws' });

mongoose.set('strictQuery', false);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use('/uploads', express.static('uploads'));
console.log('Loading middleware...');

// Initialize GridFS
let gfs;
mongoose.connection.once('open', () => {
  gfs = new GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
  console.log('✅ GridFS initialized');
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/wishlist', authMiddleware, wishlistRoutes);
app.use('/upload', authMiddleware, uploadRoutes);
app.use('/profile', authMiddleware, profileRoutes);
app.use('/search', authMiddleware, searchRoutes);
app.use('/request', authMiddleware, requestRoutes);
app.use('/friends', authMiddleware, friendRoutes);
app.use('/chat', authMiddleware, chatRoutes);
app.use('/chatrooms', authMiddleware, chatRoomRoutes);
app.use('/quiz', quizRoutes);

//app.use('/data', dataRoutes); // Add this line

// Public route to stream images and files (no authentication)
app.get('/files/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const file = files[0];
    const contentType = file.contentType || 'application/octet-stream';
    res.set('Content-Type', contentType);
    const isImage = contentType.startsWith('image');
    res.set('Content-Disposition', isImage ? 'inline' : 'attachment');
    const readStream = gfs.openDownloadStream(fileId);
    readStream.pipe(res);
  } catch (error) {
    console.error('Error streaming file:', error);
    res.status(500).json({ success: false, message: 'Error streaming file', error: error.message });
  }
});

// Stream route for e-books with option to view or download
app.get('/files/stream/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const file = files[0];
    const contentType = file.contentType || 'application/octet-stream';
    res.set('Content-Type', contentType);
    const viewMode = req.query.view !== 'false';
    const disposition = viewMode ? 'inline' : 'attachment';
    res.set('Content-Disposition', `${disposition}; filename="${file.filename}"`);
    const readStream = gfs.openDownloadStream(fileId);
    readStream.pipe(res);
  } catch (error) {
    console.error('Error streaming file:', error);
    res.status(500).json({ success: false, message: 'Error streaming file', error: error.message });
  }
});
//
//const User = require('./models/User');

// WebSocket handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket client connected');
  let authenticated = false;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);

      // Authentication
      if (data.type === 'auth') {
        const { verify } = require('jsonwebtoken');
        try {
          const decoded = verify(data.token, process.env.JWT_SECRET);
          const User = require('./models/User');
          const user = await User.findById(decoded.userId).select('name email year');
          if (!user) {
            ws.send(JSON.stringify({ type: 'auth', error: 'Unauthorized' }));
            ws.close(1008);
            return;
          }
          ws.userId = decoded.userId;
          ws.username = user.name || 'Unknown'; // Use 'name' instead of 'username'
          authenticated = true;
          if (data.roomId) {
            ws.roomId = data.roomId;
          } else if (data.receiverId) {
            ws.receiverId = data.receiverId;
          }
          ws.send(JSON.stringify({ type: 'auth', success: true, receiverId: data.receiverId, roomId: data.roomId }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'auth', error: 'Invalid token' }));
          ws.close(1008);
          return;
        }
        return;
      }

      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      // Private chat message
      if (data.receiverId && data.text) {
        const { senderId, receiverId, text, timestamp } = data;
        const Chat = require('./models/Chat');
        const newMessage = new Chat({
          sender: senderId,
          receiver: receiverId,
          text,
          timestamp: new Date(timestamp || Date.now()),
        });
        await newMessage.save();

        const User = require('./models/User');
        const sender = await User.findById(senderId).select('name');
        const senderName = sender ? sender.name : 'Unknown';

        // Send to receiver
        wss.clients.forEach((client) => {
          if (client.readyState === 1 && client.userId === receiverId) {
            client.send(JSON.stringify({
              senderId,
              senderName,
              receiverId,
              text,
              timestamp: newMessage.timestamp,
            }));
          }
        });

        // Echo to sender
        if (ws.userId === senderId && ws.readyState === 1) {
          ws.send(JSON.stringify({
            senderId,
            senderName,
            receiverId,
            text,
            timestamp: newMessage.timestamp,
          }));
        }
        return;
      }

      // Chatroom message
      if (data.roomId && data.text) {
        const ChatRoom = require('./models/ChatRoom');
        const room = await ChatRoom.findById(data.roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }

        const isMember = room.members.some(member => member.toString() === ws.userId);
        const isCreator = room.creator.toString() === ws.userId;
        if (!isMember && !isCreator) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not a room member' }));
          return;
        }

        const user = await User.findById(ws.userId).select('name');
        const senderName = user ? user.name : 'Unknown';

        const messageData = {
          sender: ws.userId,
          senderName,
          text: data.text,
          timestamp: new Date(data.timestamp || Date.now()),
        };
        room.messages.push(messageData);
        await room.save();

        // Broadcast to room members
        const memberIds = [...room.members.map(m => m.toString()), room.creator.toString()];
        wss.clients.forEach((client) => {
          if (client.readyState === 1 && memberIds.includes(client.userId)) {
            client.send(JSON.stringify({
              roomId: data.roomId,
              senderId: ws.userId,
              senderName,
              text: data.text,
              timestamp: messageData.timestamp,
            }));
          }
        });
        return;
      }

      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Keep-alive ping
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('ping', () => { ws.pong(); });

  const interval = setInterval(() => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on('close', () => clearInterval(interval));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// MongoDB Connection and Server Start
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trial')
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

module.exports = app;