const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ✅ Signup Route (Returns JWT Token)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phone, year } = req.body;

        if (!name || !email || !password || !phone || !year) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, phone, year });
        await newUser.save();

        // ✅ Generate JWT Token
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ success: true, message: 'User registered successfully', token });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
});

// ✅ Login Route (Returns JWT Token)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ success: true, token });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
});

module.exports = router;
