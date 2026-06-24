const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { buildHistoryQuery } = require('../utils/sensorHistoryQuery');

router.post('/data', async (req, res) => {
  try {
    const {
      apiKey,
      humidite_sol,
      temperature,
      humidite_air
    } = req.body;

    const result = await pool.query(
      'SELECT id FROM dispositifs WHERE cle_api = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const dispositifId = result.rows[0].id;

    await pool.query(
      `
      INSERT INTO donnees_capteurs
      (dispositif_id, humidite_sol, temperature, humidite_air)
      VALUES ($1, $2, $3, $4)
      `,
      [
        dispositifId,
        humidite_sol,
        temperature,
        humidite_air
      ]
    );

    res.status(201).json({
      message: 'Données enregistrées'
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});



router.get('/latest/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM donnees_capteurs
      WHERE dispositif_id = $1
      ORDER BY enregistre_le DESC
      LIMIT 1
      `,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Aucune donnée trouvée'
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

// Historique des mesures
router.get('/history/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, type = 'all' } = req.query;
    const allowedTypes = ['all', 'soil', 'air', 'temperature'];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: 'Type de mesure invalide'
      });
    }

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({
        message: 'Format de date invalide'
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        message: 'La date de debut doit etre avant la date de fin'
      });
    }

    const deviceResult = await pool.query(
      `
      SELECT id
      FROM dispositifs
      WHERE id = $1
      AND utilisateur_id = $2
      `,
      [deviceId, req.user.userId]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
      });
    }

    const historyQuery = buildHistoryQuery(deviceId, { startDate, endDate, type });
    const result = await pool.query(historyQuery.text, historyQuery.values);

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

module.exports = router;
