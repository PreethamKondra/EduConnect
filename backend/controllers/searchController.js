const mongoose = require('mongoose'), Upload = require('../models/Uploadm'), User = require('../models/User');

exports.searchBooks = async (req, res) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: 'Query required' });
    const u = req.user.userId, r = new RegExp(query.trim(), 'i'), b = await Upload.find({ type: 'Physical Book', $or: [{ title: r }, { author: r }], uploader: { $ne: u } }).populate('uploader', 'name email year').select('title author imageId uploader').lean(), e = await Upload.find({ type: 'E-Book', $or: [{ title: r }, { author: r }], uploader: { $ne: u } }).populate('uploader', 'name email year').select('title author fileId uploader').lean();
    res.status(200).json({ success: true, books: b.map(b => ({ _id: b._id, title: b.title, author: b.author || null, image: b.imageId ? `/files/${b.imageId}` : null, type: 'Physical Book', uploader: b.uploader ? { name: b.uploader.name || 'Unknown', email: b.uploader.email || 'Unknown', year: b.uploader.year || null } : { name: 'Unknown', email: 'Unknown', year: null } })), ebooks: e.map(e => ({ _id: e._id, title: e.title, author: e.author || null, file: e.fileId ? `/files/${e.fileId}` : null, type: 'E-Book', uploader: e.uploader ? { name: e.uploader.name || 'Unknown', email: e.uploader.email || 'Unknown', year: e.uploader.year || null } : { name: 'Unknown', email: 'Unknown', year: null } })) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error searching books', error: e.message });
  }
};

exports.getAllBooks = async (req, res) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const u = req.user.userId, b = await Upload.find({ type: 'Physical Book', uploader: { $ne: u } }).populate('uploader', 'name email year').select('title author imageId uploader').lean(), e = await Upload.find({ type: 'E-Book', uploader: { $ne: u } }).populate('uploader', 'name email year').select('title author fileId uploader').lean();
    res.status(200).json({ success: true, books: b.map(b => ({ _id: b._id, title: b.title, author: b.author || null, image: b.imageId ? `/files/${b.imageId}` : null, type: 'Physical Book', uploader: b.uploader ? { name: b.uploader.name || 'Unknown', email: b.uploader.email || 'Unknown', year: b.uploader.year || null } : { name: 'Unknown', email: 'Unknown', year: null } })), ebooks: e.map(e => ({ _id: e._id, title: e.title, author: e.author || null, file: e.fileId ? `/files/${e.fileId}` : null, type: 'E-Book', uploader: e.uploader ? { name: e.uploader.name || 'Unknown', email: e.uploader.email || 'Unknown', year: e.uploader.year || null } : { name: 'Unknown', email: 'Unknown', year: null } })) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching books', error: e.message });
  }
};