// educators-edge-backend/src/routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getCourseRecordings, getVideoDetails } = require('../controllers/videoController');

// All routes require a valid user token
router.use(verifyToken);

router.get('/course/:courseId', getCourseRecordings);
router.get('/:videoId', getVideoDetails);

module.exports = router;

// server.js
