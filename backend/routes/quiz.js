const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const express = require("express");
const router = express.Router();
const { generateQuizFromReadableFile } = require("../controllers/quizController");
const authMiddleware = require("../middleware/authMiddleware");

// Endpoint will be accessible at /quiz
router.post("/", authMiddleware, upload.single("file"), generateQuizFromReadableFile);

module.exports = router;