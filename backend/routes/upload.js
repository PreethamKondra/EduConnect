const express = require('express');
const router = express.Router();
const { upload, uploadBook, getMyUploads, deleteUpload } = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, upload.single('file'), uploadBook);
router.get('/myUploads', authMiddleware, getMyUploads);
router.delete('/delete/:id', authMiddleware, deleteUpload);

module.exports = router;