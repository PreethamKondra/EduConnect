const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');

const isUserInRoom = (room, userId) =>
  room.members.some(member => member.toString() === userId.toString()) || room.creator.toString() === userId.toString();

const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });

    const existingRoom = await ChatRoom.findOne({ name });
    if (existingRoom) return res.status(400).json({ message: "Room name already exists" });

    const userId = req.user.userId;

    const newRoom = new ChatRoom({
      name,
      creator: userId,
      members: [userId]
    });

    await newRoom.save();
    res.status(201).json({ message: "Room created successfully", room: newRoom });
  } catch (error) {
    res.status(500).json({ message: "Error creating room", error: error.message });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (isUserInRoom(room, userId)) {
      return res.status(400).json({ message: "Already a member of this room" });
    }

    room.members.push(userId);
    await room.save();

    res.status(200).json({ message: "Joined room successfully", room });
  } catch (error) {
    res.status(500).json({ message: "Error joining room", error: error.message });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isCreator = room.creator.toString() === userId.toString();
    const isMember = room.members.some(member => member.toString() === userId.toString());

    if (!isMember && !isCreator) {
      return res.status(400).json({ message: "You are not a member of this room" });
    }

    if (isCreator) {
      // Transfer creator role to the next member (second person who joined)
      if (room.members.length > 1) {
        const newCreatorId = room.members[1]; // Next member after creator
        room.creator = newCreatorId;
        room.members = room.members.filter(member => member.toString() !== userId.toString());
      } else {
        // If no other members, delete the room
        await room.deleteOne();
        return res.status(200).json({ message: "Room deleted as no members remain" });
      }
    } else {
      // Regular member leaving
      room.members = room.members.filter(member => member.toString() !== userId.toString());
    }

    await room.save();

    res.status(200).json({ message: "Left room successfully", room });
  } catch (error) {
    res.status(500).json({ message: "Error leaving room", error: error.message });
  }
};

const sendRoomMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: "Message text is required" });

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(member => member.toString() === req.user.userId.toString());
    const isCreator = room.creator.toString() === req.user.userId.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({ message: "You must join the room to send messages" });
    }

    const user = await User.findById(req.user.userId).select('name');
    const senderName = user ? user.name : 'Unknown';

    const messageData = {
      sender: req.user.userId,
      senderName,
      text,
      timestamp: new Date(),
    };
    room.messages.push(messageData);
    await room.save();

    res.status(200).json({ message: "Message sent in room", message: messageData });
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.creator.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Only the creator can delete this room" });
    }

    await room.deleteOne();
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting room", error: error.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find().select('name');
    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat rooms", error: error.message });
  }
};

const searchRooms = async (req, res) => {
  try {
    const { query } = req.query;
    const searchRegex = new RegExp(query, 'i');
    const rooms = await ChatRoom.find({ name: searchRegex }).select('name');
    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Error searching chat rooms", error: error.message });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user.userId;
    
    const room = await ChatRoom.findById(roomId).populate('messages.sender', 'name');
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(member => member.toString() === currentUserId.toString());
    const isCreator = room.creator.toString() === currentUserId.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({ message: "Join the room to view messages" });
    }

    const messagesWithNames = room.messages.map(msg => {
      const isCurrentUser = msg.sender && msg.sender._id.toString() === currentUserId.toString();
      
      return {
        ...msg.toObject(),
        senderId: msg.sender ? msg.sender._id : msg.sender,
        senderName: isCurrentUser ? 'You' : (msg.sender ? msg.sender.name : 'Unknown'),
        isCurrentUser: isCurrentUser // Adding a flag to easily identify current user's messages
      };
    });

    res.status(200).json({ messages: messagesWithNames });
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
};

const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const rooms = await ChatRoom.find({
      $or: [
        { creator: userId },
        { members: userId }
      ]
    }).select('name creator members');

    if (rooms.length === 0) {
      return res.status(404).json({ message: "No rooms found for this user" });
    }

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Error fetching rooms", error: error.message });
  }
};

const getCreatedRooms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const rooms = await ChatRoom.find({ creator: userId }).select('name creator members');

    if (rooms.length === 0) {
      return res.status(404).json({ message: "You have not created any rooms" });
    }

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Error fetching created rooms", error: error.message });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  deleteRoom,
  getRoomMessages,
  getAllRooms,
  searchRooms,
  getMyRooms,
  getCreatedRooms
};