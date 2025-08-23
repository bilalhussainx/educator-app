// ----------------------------------------------------------------
// 4. NEW FILE: routes/deploymentRoutes.js
// ----------------------------------------------------------------
const express = require('express');
const { handleDeployment } = require('../controllers/deploymentController');
// Optional: Add authentication middleware if you want to protect this route
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Sets up the route POST /api/deploy/
// To protect the route, you would change it to:
// router.post('/', protect, handleDeployment);
router.post('/', handleDeployment);

module.exports = router;

