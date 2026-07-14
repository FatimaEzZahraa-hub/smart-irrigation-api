const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.get(
    '/recommendation/:deviceId',
    authMiddleware,
    aiController.getRecommendation
);

module.exports = router;
