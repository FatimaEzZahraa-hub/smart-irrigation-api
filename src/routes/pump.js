const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Device = require('../models/postgres/Device');
const PumpLog = require('../models/postgres/PumpLog');
const { isDemoMode, getDemoPumpHistory } = require('../utils/demo');

// Pump ON
router.post('/on', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    const device = await Device.findByIdAndUserId(deviceId, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    await PumpLog.create({
      deviceId,
      action: 'ON',
      triggeredBy: 'manual'
    });

    res.status(201).json({
      message: 'Pompe activée'
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Pump OFF
router.post('/off', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    const device = await Device.findByIdAndUserId(deviceId, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    await PumpLog.create({
      deviceId,
      action: 'OFF',
      triggeredBy: 'manual'
    });

    res.status(201).json({
      message: 'Pompe arrêtée'
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Get pump history for a device
router.get('/history/:deviceId', authMiddleware, async (req, res) => {
  if (isDemoMode()) {
    return res.json(getDemoPumpHistory(req.params.deviceId));
  }

  try {
    const { deviceId } = req.params;

    const device = await Device.findByIdAndUserId(deviceId, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const pumpLogs = await PumpLog.findByDeviceIdAndUserId(deviceId, req.user.userId);

    res.json(pumpLogs);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
