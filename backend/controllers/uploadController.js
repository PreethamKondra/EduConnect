const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const Upload = require('../models/Uploadm');

console.log('✅ uploadController.js: Loading controller...');

let gfs;
const initializeGfs = () => {
  if (!gfs) {
    gfs = new GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
    console.log('✅ uploadController.js: GridFS initialized');
  }
  return gfs;
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedFileTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (req.body.type === 'Physical Book' && file && !allowedImageTypes.includes(file.mimetype)) {
      return cb(new Error('Physical Books require JPEG or PNG images if an image is provided'));
    }
    if (req.body.type === 'E-Book' && !allowedFileTypes.includes(file.mimetype)) {
      return cb(new Error('E-Books require PDF, Word, or PPT files'));
    }
    cb(null, true);
  },
});

const uploadBook = async (req, res) => {
  try {
    console.log('✅ uploadBook: Request received', {
      body: req.body,
      file: req.file ? req.file.originalname : 'No file',
      user: req.user,
    });
    const { title, author, type } = req.body;
    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Title and type are required' });
    }
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      console.error('❌ uploadBook: Invalid user ID', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    if (!['Physical Book', 'E-Book'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    const uploader = req.user.userId;
    const gfsInstance = initializeGfs();

    let fileId = null;
    if (req.file) {
      const writeStream = gfsInstance.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      writeStream.write(req.file.buffer);
      writeStream.end();
      fileId = writeStream.id;

      await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log('✅ uploadBook: File written to GridFS, ID:', fileId);
          resolve();
        });
        writeStream.on('error', (err) => {
          console.error('❌ uploadBook: GridFS write error:', err);
          reject(err);
        });
      });
    }

    if (type === 'E-Book') {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File is required for E-Books' });
      }
      const existingEbook = await Upload.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        author: author || null,
        type: 'E-Book',
      });
      if (existingEbook) {
        await gfsInstance.delete(fileId);
        return res.status(400).json({ success: false, message: 'E-Book with this title and author already exists' });
      }

      const newEbook = new Upload({
        type,
        title,
        author,
        fileId,
        uploader,
      });
      await newEbook.save();
      console.log('✅ uploadBook: Saved E-Book:', newEbook);
      return res.status(201).json({
        success: true,
        message: 'E-Book uploaded successfully',
        book: {
          _id: newEbook._id,
          title: newEbook.title,
          author: newEbook.author,
          type: newEbook.type,
          file: fileId ? `/files/${newEbook.fileId}` : null, // Updated to /files/
          uploader: {
            _id: newEbook.uploader,
            name: req.user.name,
            email: req.user.email,
          },
        },
      });
    } else if (type === 'Physical Book') {
      let existingBookCount = await Upload.countDocuments({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        type: 'Physical Book',
      });
      let finalTitle = title;
      if (existingBookCount > 0) {
        let newTitle = `${title} (${existingBookCount})`;
        while (await Upload.findOne({ title: newTitle, type: 'Physical Book' })) {
          existingBookCount++;
          newTitle = `${title} (${existingBookCount})`;
        }
        finalTitle = newTitle;
      }
      console.log('✅ uploadBook: Final title for Physical Book:', finalTitle);

      const newBook = new Upload({
        type,
        title: finalTitle,
        author,
        imageId: fileId,
        uploader,
      });
      await newBook.save();
      console.log('✅ uploadBook: Saved Physical Book:', newBook);
      return res.status(201).json({
        success: true,
        message: 'Physical Book uploaded successfully',
        book: {
          _id: newBook._id,
          title: newBook.title,
          author: newBook.author,
          type: newBook.type,
          image: fileId ? `/files/${newBook.imageId}` : null,
          uploader: {
            _id: newBook.uploader,
            name: req.user.name,
            email: req.user.email,
          },
        },
      });
    } else {
      if (fileId) await gfsInstance.delete(fileId);
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }
  } catch (error) {
    console.error('❌ uploadBook: Error uploading book:', error);
    if (fileId) await gfsInstance.delete(fileId);
    res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
  }
};

const getMyUploads = async (req, res) => {
  try {
    console.log('✅ getMyUploads: Fetching uploads for user', req.user.userId);
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const uploads = await Upload.find({ uploader: req.user.userId })
      .select('title author type imageId fileId uploader')
      .lean();

    uploads.forEach((upload) => {
      if (upload.type === 'Physical Book' && upload.imageId) {
        upload.image = `/files/${upload.imageId}`;
        delete upload.imageId;
      }
      if (upload.type === 'E-Book' && upload.fileId) {
        upload.file = `/files/${upload.fileId}`; // Updated to /files/
        delete upload.fileId;
      }
      upload.uploader = {
        _id: upload.uploader,
        name: req.user.name,
        email: req.user.email,
      };
    });

    res.status(200).json({ success: true, uploads });
  } catch (error) {
    console.error('❌ getMyUploads: Error fetching uploads:', error);
    res.status(500).json({ success: false, message: 'Server error fetching uploads' });
  }
};

const deleteUpload = async (req, res) => {
  try {
    console.log('✅ deleteUpload: Deleting upload', { id: req.params.id, user: req.user });
    const gfsInstance = initializeGfs();
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }

    const upload = await Upload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }

    // Enhanced logging for debugging
    const rawUploader = upload.uploader;
    const rawUserId = req.user.userId;
    console.log('✅ deleteUpload: Raw values', {
      rawUploader,
      rawUserId,
      rawUploaderType: typeof rawUploader,
      rawUserIdType: typeof rawUserId,
    });
    console.log('✅ deleteUpload: Converted values', {
      uploaderString: rawUploader.toString(),
      userIdString: rawUserId.toString(),
      uploaderValue: rawUploader.valueOf(),
      userIdValue: rawUserId.valueOf(),
    });

    if (!upload.uploader) {
      console.log('❌ deleteUpload: No uploader set for upload', upload._id);
      return res.status(400).json({ success: false, message: 'Upload has no uploader' });
    }

    // Validate and normalize uploader
    let uploaderId = upload.uploader;
    if (typeof uploaderId === 'string' && mongoose.Types.ObjectId.isValid(uploaderId)) {
      uploaderId = new mongoose.Types.ObjectId(uploaderId);
      console.log('✅ deleteUpload: Converted string uploader to ObjectId', uploaderId);
    } else if (typeof uploaderId !== 'object' || !uploaderId instanceof mongoose.Types.ObjectId) {
      console.error('❌ deleteUpload: Invalid uploader type', typeof uploaderId);
      return res.status(500).json({ success: false, message: 'Invalid uploader format in database' });
    }

    let userId = req.user.userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
      console.log('✅ deleteUpload: Converted string userId to ObjectId', userId);
    } else if (typeof userId !== 'object' || !userId instanceof mongoose.Types.ObjectId) {
      console.error('❌ deleteUpload: Invalid userId type', typeof userId);
      return res.status(500).json({ success: false, message: 'Invalid userId format' });
    }

    console.log('✅ deleteUpload: Normalized values', {
      normalizedUploaderId: uploaderId,
      normalizedUserId: userId,
    });

    if (uploaderId.valueOf() !== userId.valueOf()) {
      console.log('❌ deleteUpload: Uploader mismatch', {
        uploaderId: uploaderId.valueOf(),
        userId: userId.valueOf(),
      });
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this upload' });
    }

    // Delete associated GridFS files
    const deleteGridFSFile = async (fileId) => {
      if (fileId) {
        try {
          const files = await gfsInstance.find({ _id: fileId }).toArray();
          if (files.length > 0) {
            await gfsInstance.delete(fileId);
            console.log('✅ deleteUpload: Deleted GridFS file', fileId);
          } else {
            console.log('⚠️ deleteUpload: No GridFS file found for', fileId);
          }
        } catch (gridFsError) {
          console.error('❌ deleteUpload: Failed to delete GridFS file', { fileId, error: gridFsError.message });
        }
      }
    };

    await deleteGridFSFile(upload.imageId);
    await deleteGridFSFile(upload.fileId);

    // Delete the upload document
    await upload.deleteOne();
    console.log('✅ deleteUpload: Deleted upload document', upload._id);
    res.status(200).json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('❌ deleteUpload: Error deleting upload:', error);
    res.status(500).json({ success: false, message: 'Server error deleting upload', error: error.message });
  }
};

module.exports = { upload, uploadBook, getMyUploads, deleteUpload };