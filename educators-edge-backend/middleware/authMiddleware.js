/*
 * =================================================================
 * FOLDER: educators-edge-backend/middleware/
 * FILE:   authMiddleware.js (CORRECTED)
 * =================================================================
 * DESCRIPTION: This file contains the corrected logic for verifying
 * the JSON Web Token.
 */

const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  // Get token from the Authorization header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // THIS IS THE FIX:
    // We are now attaching the entire `user` object (which includes the role)
    // to the request object, instead of just the ID.
    req.user = decoded.user;

    next(); // Proceed to the next middleware (e.g., isTeacher) or the controller.
  } catch (err) {
    res.status(403).json({ msg: 'Token is not valid' });
  }
};

