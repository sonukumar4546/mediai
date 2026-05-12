/**
 * backend/middleware/auth.js
 * JWT authentication middleware
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'mediai_super_secret_jwt_key_2025_change_in_production';
  
  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
}

module.exports = authMiddleware;
