const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Alert = require('../models/postgres/Alert');
const Device = require('../models/postgres/Device');

// Liste des alertes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const alerts = await Alert.findAllByUserId(req.user.userId);

    res.json(alerts);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Créer une alerte
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      deviceId,
      type_alerte: alertType,
      message,
      severite: severity
    } = req.body;

    const normalizedSeverity = severity || 'warning';

    if (!alertType || !message) {
      return res.status(400).json({
        message: 'Type et message requis'
      });
    }

    if (!['info', 'warning', 'critical'].includes(normalizedSeverity)) {
      return res.status(400).json({
        message: 'Severite invalide'
      });
    }

    const device = await Device.findByIdAndUserId(deviceId, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const alert = await Alert.create({
      deviceId,
      alertType,
      message,
      severity: normalizedSeverity
    });

    res.status(201).json(alert);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Résoudre une alerte
router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.resolveByIdAndUserId(id, req.user.userId);

    if (!alert) {
      return res.status(404).json({
        message: 'Alerte introuvable'
      });
    }

    res.json(alert);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
