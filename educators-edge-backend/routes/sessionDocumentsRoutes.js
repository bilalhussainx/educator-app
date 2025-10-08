/**
 * ================================================================
 * SESSION DOCUMENTS ROUTES
 * ================================================================
 * API routes for managing urgent and live essay session documents
 */

const express = require('express');
const router = express.Router();
const sessionDocumentsController = require('../controllers/sessionDocumentsController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Document Management Routes
router.get('/', sessionDocumentsController.getUserSessionDocuments);
router.post('/', sessionDocumentsController.createOrUpdateDocument);
router.get('/stats', sessionDocumentsController.getSessionStats);

// Session-specific routes
router.get('/session/:sessionId', sessionDocumentsController.getSessionDocuments);

// Document-specific routes
router.get('/:documentId', sessionDocumentsController.getDocument);
router.delete('/:documentId', sessionDocumentsController.deleteDocument);
router.get('/:documentId/versions', sessionDocumentsController.getDocumentVersions);

// Document tagging and sharing
router.post('/:documentId/tags', sessionDocumentsController.addDocumentTags);
router.post('/:documentId/share', sessionDocumentsController.shareDocument);

module.exports = router;