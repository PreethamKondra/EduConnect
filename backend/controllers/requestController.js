const Request = require('../models/Request');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer = require('multer');

let gfs;
mongoose.connection.once('open', () => {
  gfs = new GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
});

// Configure multer to store file in memory (for GridFS)
const upload = multer({ storage: multer.memoryStorage() });

const requestBook = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const { title, author, type } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (type && !['Physical Book', 'E-Book', 'Physical/E-Book'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    let imageId = null;
    if (req.file) {
      const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      imageId = uploadStream.id;
    }

    const newRequest = new Request({
      title,
      author,
      type: type || 'Physical/E-Book',
      image: imageId,
      user: req.user.userId,
    });

    await newRequest.save();
    await newRequest.populate('user', 'name email year');
    res.status(201).json({
      success: true,
      message: 'Book request posted successfully',
      request: {
        _id: newRequest._id,
        title: newRequest.title,
        author: newRequest.author,
        type: newRequest.type,
        image: imageId,
        user: newRequest.user,
      },
    });
  } catch (error) {
    console.error('Error requesting book:', error);
    res.status(500).json({ success: false, message: 'Server error requesting book' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    // Get the current user's ID if they're logged in
    const currentUserId = req.user?.userId;
    
    // Create the query - if the user is logged in, exclude their requests
    const query = currentUserId ? { user: { $ne: currentUserId } } : {};
    
    const requests = await Request.find(query)
      .populate('user', 'name email year')
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
};

const getMyRequests = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const requests = await Request.find({ user: req.user.userId })
      .populate('user', 'name email year')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching my requests:', error);
    res.status(500).json({ success: false, message: 'Server error fetching your requests' });
  }
};

const deleteRequest = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!request.user.equals(req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this request' });
    }

    if (request.image) {
      await gfs.delete(new mongoose.Types.ObjectId(request.image));
    }
    await request.deleteOne();
    res.status(200).json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ success: false, message: 'Server error deleting request' });
  }
};

module.exports = {
  upload,
  requestBook,
  getAllRequests,
  getMyRequests,
  deleteRequest,
};