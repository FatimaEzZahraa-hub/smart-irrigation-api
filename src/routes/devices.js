const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const Device = require('../models/postgres/Device');
const DeviceSettings = require('../models/postgres/DeviceSettings');
const { isDemoMode, getDemoDevices } = require('../utils/demo');

// Ajouter un dispositif
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      nom: name,
      emplacement: location,
      latitude,
      longitude
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'Nom du dispositif requis'
      });
    }

    const normalizedLatitude = latitude === undefined || latitude === null || latitude === ''
      ? null
      : Number(latitude);
    const normalizedLongitude = longitude === undefined || longitude === null || longitude === ''
      ? null
      : Number(longitude);

    if (
      (normalizedLatitude !== null && (!Number.isFinite(normalizedLatitude) || normalizedLatitude < -90 || normalizedLatitude > 90)) ||
      (normalizedLongitude !== null && (!Number.isFinite(normalizedLongitude) || normalizedLongitude < -180 || normalizedLongitude > 180))
    ) {
      return res.status(400).json({
        message: 'Coordonnees invalides'
      });
    }

    const apiKey = crypto.randomBytes(16).toString('hex');

    const device = await Device.create({
      userId: req.user.userId,
      name,
      location,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      apiKey
    });

    res.status(201).json(device);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Liste des devices de l'utilisateur
router.get('/', authMiddleware, async (req, res) => {
  if (isDemoMode()) {
    return res.json(getDemoDevices());
  }

  try {
    const devices = await Device.findAllByUserId(req.user.userId);

    res.json(devices);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Paramètres d'irrigation d'un dispositif
router.get('/:id/settings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByIdAndUserId(id, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const settings = await DeviceSettings.findByDeviceId(id);

    res.json({
      humidityThreshold: settings ? Number(settings.humidity_threshold) : 40,
      irrigationDurationMinutes: settings ? settings.irrigation_duration_minutes : 10,
      isRainSkipEnabled: settings ? settings.is_rain_skip_enabled : false,
      plantName: settings?.plant_name ?? null,
      plantingDate: settings?.planting_date ?? null,
      updatedAt: settings?.updated_at ?? null
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Enregistrer les paramètres d'irrigation d'un dispositif
router.put('/:id/settings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { humidityThreshold, irrigationDurationMinutes, isRainSkipEnabled, plantName, plantingDate } = req.body;

    if (typeof humidityThreshold !== 'number' || humidityThreshold < 10 || humidityThreshold > 90) {
      return res.status(400).json({
        message: 'humidityThreshold doit être un nombre entre 10 et 90'
      });
    }

    if (!Number.isInteger(irrigationDurationMinutes) || irrigationDurationMinutes < 1 || irrigationDurationMinutes > 120) {
      return res.status(400).json({
        message: 'irrigationDurationMinutes doit être un entier entre 1 et 120'
      });
    }

    if (typeof isRainSkipEnabled !== 'boolean') {
      return res.status(400).json({
        message: 'isRainSkipEnabled doit être un booléen'
      });
    }

    if (plantName !== undefined && plantName !== null && (typeof plantName !== 'string' || plantName.length > 100)) {
      return res.status(400).json({
        message: 'plantName doit être une chaîne de 100 caractères maximum'
      });
    }

    if (plantingDate !== undefined && plantingDate !== null) {
      if (typeof plantingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(plantingDate)) {
        return res.status(400).json({
          message: 'plantingDate doit être une date au format AAAA-MM-JJ'
        });
      }

      const parsedDate = new Date(plantingDate);

      if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() > Date.now()) {
        return res.status(400).json({
          message: 'plantingDate invalide ou dans le futur'
        });
      }
    }

    const device = await Device.findByIdAndUserId(id, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const settings = await DeviceSettings.upsert({
      deviceId: id,
      humidityThreshold,
      irrigationDurationMinutes,
      isRainSkipEnabled,
      plantName: plantName ? plantName.trim() : null,
      plantingDate: plantingDate ?? null
    });

    res.json({
      message: 'Settings saved successfully',
      settings
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Détails d'un dispositif
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByIdAndUserId(id, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    res.json(device);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Modifier le mode d'un dispositif
router.patch('/:id/mode', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.body;

    if (!['manual', 'auto'].includes(mode)) {
      return res.status(400).json({
        message: 'Mode invalide'
      });
    }

    const device = await Device.updateMode(id, req.user.userId, mode);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    res.json({
      message: 'Device mode updated successfully',
      device
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Modifier un dispositif
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, latitude, longitude } = req.body;

    if ('mode' in req.body || 'apiKey' in req.body || 'userId' in req.body) {
      return res.status(400).json({
        message: 'Champs non modifiables'
      });
    }

    const normalizedLatitude = latitude === undefined
      ? undefined
      : (latitude === null || latitude === '' ? null : Number(latitude));
    const normalizedLongitude = longitude === undefined
      ? undefined
      : (longitude === null || longitude === '' ? null : Number(longitude));

    if (
      (normalizedLatitude !== undefined && normalizedLatitude !== null && (!Number.isFinite(normalizedLatitude) || normalizedLatitude < -90 || normalizedLatitude > 90)) ||
      (normalizedLongitude !== undefined && normalizedLongitude !== null && (!Number.isFinite(normalizedLongitude) || normalizedLongitude < -180 || normalizedLongitude > 180))
    ) {
      return res.status(400).json({
        message: 'Coordonnees invalides'
      });
    }

    const device = await Device.findByIdAndUserId(id, req.user.userId);

    if (!device) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (normalizedLatitude !== undefined) updates.latitude = normalizedLatitude;
    if (normalizedLongitude !== undefined) updates.longitude = normalizedLongitude;

    const updated = await Device.updateByIdAndUserId(id, req.user.userId, updates);

    if (!updated) {
      return res.status(400).json({
        message: 'Aucun champ à modifier'
      });
    }

    res.json({
      message: 'Device updated successfully',
      device: updated
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Supprimer un dispositif
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Device.deleteByIdAndUserId(id, req.user.userId);

    if (!deleted) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    res.status(204).end();

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
