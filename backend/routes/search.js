// routes/search.js
const express = require('express');
const router = express.Router();
const { searchBooks, getAllBooks } = require('../controllers/searchController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('✅ search.js: Registering routes');
router.get('/', authMiddleware, searchBooks); // ✅ Search books & eBooks
router.get('/all', authMiddleware, getAllBooks); // ✅ Get all books & eBooks

module.exports = router;