const jwt = require('jsonwebtoken');
const User = require('../models/User');

console.log('✅ authMiddleware.js: Loading middleware...');

module.exports = async (req, res, next) => {
  console.log('✅ authMiddleware: Checking authorization...');
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ authMiddleware: No token provided');
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!verified.userId) {
      console.log('❌ authMiddleware: Invalid token structure');
      return res.status(401).json({ message: 'Invalid Token Structure' });
    }

    const user = await User.findById(verified.userId).select('name email year');
    if (!user) {
      console.log('❌ authMiddleware: User not found');
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      year: user.year
    };

    console.log(`✅ authMiddleware: Authenticated User: ${req.user.name} (ID: ${req.user.userId})`);
    next();
  } catch (err) {
    console.error('❌ authMiddleware: JWT Verification Error:', err.message);
    res.status(401).json({ message: 'Invalid or Expired Token' });
  }
};