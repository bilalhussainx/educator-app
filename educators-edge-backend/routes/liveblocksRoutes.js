const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeLiveblocks } = require('../controllers/liveblocksController');

router.post('/auth', verifyToken, authorizeLiveblocks);

module.exports = router;