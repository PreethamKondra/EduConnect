const User = require('../models/User');
const Chat = require('../models/Chat');

// Get Profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email phone year');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, profile: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching profile", error: error.message });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, year } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (year) user.year = year;
    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", profile: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

// Send Message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;
    if (!receiverId || !text) {
      return res.status(400).json({ success: false, message: "Receiver ID and text are required" });
    }
    const newMessage = new Chat({
      sender: senderId,
      receiver: receiverId,
      text,
      timestamp: new Date(),
    });
    await newMessage.save();
    res.status(201).json({ success: true, message: "Message sent", data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error sending message", error: error.message });
  }
};

// Get Messages
const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.userId;
    const messages = await Chat.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }).sort('timestamp');
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching messages", error: error.message });
  }
};


// Authenticate WebSocket
const authenticateWebSocket = async (ws, req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ws.close(1008, 'Authentication required');
    return false;
  }

  const token = authHeader.split(' ')[1];
  try {
    const { verify } = require('jsonwebtoken');
    const decoded = verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('name email year');
    if (!user) {
      ws.close(1008, 'Unauthorized');
      return false;
    }
    ws.userId = decoded.userId; // Attach userId to WebSocket connection
    return true;
  } catch (err) {
    ws.close(1008, 'Invalid token');
    return false;
  }
};

const getAvailableUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    // Example: Fetch all users except the current user (or use friends list if implemented)
    const users = await User.find({ _id: { $ne: currentUserId } }).select('_id name email');
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching available users', error: error.message });
  }
};

const getChatPartners = async (req, res) => {
  try {
    const currentUserId = req.user.userId.toString();
   // console.log('Current user ID:', currentUserId);

    const chats = await Chat.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .lean()
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    //console.log('Raw chats (with population):', chats);

    const seen = new Set();
    const partners = [];

    for (const chat of chats) {
      const senderId = chat.sender?._id?.toString();
      const receiverId = chat.receiver?._id?.toString();

      if (!senderId || !receiverId) continue;

      let partner;

      if (senderId === currentUserId) {
        partner = chat.receiver;
      } else if (receiverId === currentUserId) {
        partner = chat.sender;
      }

      if (partner) {
        const partnerId = partner._id.toString();
        if (!seen.has(partnerId)) {
          seen.add(partnerId);
          partners.push({
            _id: partnerId,
            name: partner.name,
            email: partner.email,
          });
        }
      }
    }

    console.log('Processed chat partners:', partners);
    res.status(200).json({ success: true, partners });
  } catch (error) {
    console.error('Error fetching chat partners:', error);
    res.status(500).json({ success: false, message: 'Error fetching chat partners', error: error.message });
  }
};



const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.userId;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // Exclude current user
        { $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ]},
      ],
    }).select('_id name email');
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching users', error: error.message });
  }
};

module.exports = { getProfile, updateProfile, sendMessage, getMessages, searchUsers, authenticateWebSocket, getAvailableUsers, getChatPartners };