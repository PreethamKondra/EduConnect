const Wishlist = require('../models/Wishlist');
const Upload = require('../models/Uploadm');
const User = require('../models/User');
const mongoose = require('mongoose');

const addToWishlistBySearch = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const userId = req.user.userId;
    const { title, author, type } = req.body;
    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Title and type are required' });
    }

    // Validate type
    const validTypes = ['Physical Book', 'E-Book'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Must be "Physical Book" or "E-Book"' });
    }

    // Use _id directly if provided in the body (from BrowseBooks component)
    if (req.body._id) {
      const bookId = req.body._id;
      const book = await Upload.findById(bookId);
      
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book or eBook not found with this ID' });
      }
      
      // Find or create the user's wishlist
      let wishlist = await Wishlist.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!wishlist) {
        wishlist = new Wishlist({ 
          userId: new mongoose.Types.ObjectId(userId),
          items: [] 
        });
      }

      // Check if the book is already in the wishlist
      const alreadyExists = wishlist.items.some(
        (item) => item.bookId.toString() === bookId
      );
      
      if (alreadyExists) {
        return res.status(400).json({ success: false, message: 'Already in wishlist' });
      }

      // Add bookId to the wishlist
      wishlist.items.push({ bookId });
      await wishlist.save();

      // For response, fetch the complete book info
      const bookWithDetails = await Upload.findById(bookId)
        .populate('uploader', 'name email year')
        .lean();

      // Format the response
      const bookResponse = {
        bookId: bookWithDetails._id,
        title: bookWithDetails.title,
        author: bookWithDetails.author || null,
        image: bookWithDetails.imageId ? `/files/${bookWithDetails.imageId}` : null,
        file: bookWithDetails.type === 'E-Book' && bookWithDetails.fileId ? `/files/${bookWithDetails.fileId}` : null,
        type: bookWithDetails.type,
        uploader: bookWithDetails.uploader
          ? {
              name: bookWithDetails.uploader.name || 'Unknown',
              email: bookWithDetails.uploader.email || 'Unknown',
              year: bookWithDetails.uploader.year || null,
            }
          : { name: 'Unknown', email: 'Unknown', year: null },
      };

      return res.status(201).json({
        success: true,
        message: 'Added to wishlist',
        item: bookResponse,
      });
    }

    // If no _id provided, try to find by title (legacy approach)
    // This handles base titles without suffixes for duplicate books
    const baseTitle = title.replace(/\s+\(\d+\)$/, '');

    const query = {
      title: { $regex: new RegExp(`^${baseTitle}(\\s+\\(\\d+\\))?$`, 'i') },
      type: type,
    };
    if (author) {
      query.author = { $regex: new RegExp(`^${author}$`, 'i') };
    }

    // Find the book/ebook in the uploads collection
    const book = await Upload.findOne(query).lean();

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book or eBook not found with this title and author' });
    }

    // Find or create the user's wishlist
    let wishlist = await Wishlist.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wishlist) {
      wishlist = new Wishlist({ 
        userId: new mongoose.Types.ObjectId(userId),
        items: [] 
      });
    }

    // Check if the book is already in the wishlist
    const alreadyExists = wishlist.items.some(
      (item) => item.bookId.toString() === book._id.toString()
    );
    
    if (alreadyExists) {
      return res.status(400).json({ success: false, message: 'Already in wishlist' });
    }

    // Add only the bookId to the wishlist
    wishlist.items.push({ bookId: book._id });
    await wishlist.save();

    // For response, fetch the complete book info
    const bookWithDetails = await Upload.findById(book._id)
      .populate('uploader', 'name email year')
      .lean();

    // Format the response
    const bookResponse = {
      bookId: bookWithDetails._id,
      title: bookWithDetails.title,
      author: bookWithDetails.author || null,
      image: bookWithDetails.imageId ? `/files/${bookWithDetails.imageId}` : null,
      file: bookWithDetails.type === 'E-Book' && bookWithDetails.fileId ? `/files/${bookWithDetails.fileId}` : null,
      type: bookWithDetails.type,
      uploader: bookWithDetails.uploader
        ? {
            name: bookWithDetails.uploader.name || 'Unknown',
            email: bookWithDetails.uploader.email || 'Unknown',
            year: bookWithDetails.uploader.year || null,
          }
        : { name: 'Unknown', email: 'Unknown', year: null },
    };

    res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      item: bookResponse,
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Server error adding to wishlist', error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const userId = req.user.userId;
    console.log('Fetching wishlist for user ID:', userId);
    
    // Find the user's wishlist
    const wishlist = await Wishlist.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    console.log('Retrieved wishlist:', wishlist);
    
    if (!wishlist || wishlist.items.length === 0) {
      console.log('Wishlist is empty or not found');
      return res.status(200).json({ success: true, message: 'Wishlist is empty', items: [] });
    }

    // Get all bookIds from the wishlist
    const bookIds = wishlist.items.map(item => item.bookId);
    console.log('Book IDs in wishlist:', bookIds);
    
    // Fetch complete book information for all items in one query
    const books = await Upload.find({ _id: { $in: bookIds } })
      .populate('uploader', 'name email year')
      .lean();
    
    console.log('Retrieved books:', books);
    
    // Map the books to the format expected by the frontend
    const formattedItems = books.map(book => {
      return {
        bookId: book._id,
        title: book.title || 'Unknown Title',
        author: book.author || null,
        image: book.imageId ? `/files/${book.imageId}` : null,
        file: book.type === 'E-Book' && book.fileId ? `/files/${book.fileId}` : null,
        type: book.type || 'Physical Book',
        uploader: book.uploader
          ? {
              name: book.uploader.name || 'Unknown',
              email: book.uploader.email || 'Unknown',
              year: book.uploader.year || null,
            }
          : { name: 'Unknown', email: 'Unknown', year: null },
      };
    });

    console.log('Formatted items to return:', formattedItems);
    res.status(200).json({ success: true, items: formattedItems });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wishlist', error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const userId = req.user.userId;
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ success: false, message: 'Book ID is required' });
    }

    const wishlist = await Wishlist.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item.bookId.toString() === bookId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    res.status(200).json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Server error removing from wishlist', error: error.message });
  }
};

module.exports = { addToWishlistBySearch, getWishlist, removeFromWishlist };