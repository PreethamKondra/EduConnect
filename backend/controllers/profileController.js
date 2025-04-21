const User = require('../models/User');

// Get Profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email phone year');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, profile: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching profile", error: error.message });
  }
};

// Update Profile (only name, phone, year)
const updateProfile = async (req, res) => {
  try {
    const { name, phone, year } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (year) user.year = year;

    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", profile: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

module.exports = { getProfile, updateProfile };