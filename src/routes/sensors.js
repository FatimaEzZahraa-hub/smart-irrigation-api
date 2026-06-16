const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM donnees_capteurs
      WHERE dispositif_id = $1
      ORDER BY enregistre_le DESC
      LIMIT 100
      `,
      [deviceId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;