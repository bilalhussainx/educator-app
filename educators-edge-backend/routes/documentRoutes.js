// educators-edge-backend/src/routes/documentRoutes.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
// You may want to add an `isTeacher` middleware here in the future
// if you want to restrict document creation to only teachers.
const { createDocument, uploadDocument, getDocument } = require('../controllers/documentController');

// This route is protected by our existing, robust authentication.
router.post('/create', verifyToken, createDocument);

// Upload document for urgent sessions or chat
router.post('/upload', verifyToken, ...uploadDocument);

// Get document by ID
router.get('/:documentId', verifyToken, getDocument);

module.exports = router;