const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const sensorController = require('../controllers/sensorController');


router.post(
    '/data', 
    sensorController.storeReading
);


router.get(
    '/latest/:deviceId',
    authMiddleware,
    sensorController.getLatestReading
);

// Historique des mesures
router.get(
    '/history/:deviceId',
    authMiddleware,
    sensorController.getHistory
);

module.exports = router;
