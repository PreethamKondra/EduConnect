const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getProfile, updateProfile } = require("../controllers/profileController");

router.get("/", authMiddleware, getProfile);         // ✅ View Profile
router.put("/update", authMiddleware, updateProfile); // ✅ Update Profile

module.exports = router;
