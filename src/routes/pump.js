const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Pump ON
router.post('/on', async (req, res) => {
  try {
    const { deviceId } = req.body;

    await pool.query(
      `
      INSERT INTO journal_pompe
      (dispositif_id, action, declenche_par)
      VALUES ($1, 'ON', 'manuel')
      `,
      [deviceId]
    );

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
router.post('/off', async (req, res) => {
  try {
    const { deviceId } = req.body;

    await pool.query(
      `
      INSERT INTO journal_pompe
      (dispositif_id, action, declenche_par)
      VALUES ($1, 'OFF', 'manuel')
      `,
      [deviceId]
    );

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

// Get pump history for a device - journal_pompe
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM journal_pompe
      WHERE dispositif_id = $1
      ORDER BY declenche_le DESC
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