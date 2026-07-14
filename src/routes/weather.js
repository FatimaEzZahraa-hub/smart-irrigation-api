const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const weatherController = require('../controllers/weatherController');

router.get(
    '/:zoneId',
    authMiddleware,
    weatherController.getZoneWeather
);

module.exports = router;
