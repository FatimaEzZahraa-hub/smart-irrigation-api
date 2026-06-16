const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Liste des alertes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*
      FROM alertes a
      JOIN dispositifs d
      ON a.dispositif_id = d.id
      WHERE d.utilisateur_id = $1
      ORDER BY a.cree_le DESC
    `, [req.user.userId]);

    res.json(result.rows);

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
      type_alerte,
      message,
      severite
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO alertes
      (
        dispositif_id,
        type_alerte,
        message,
        severite
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        deviceId,
        type_alerte,
        message,
        severite || 'warning'
      ]
    );

    res.status(201).json(result.rows[0]);

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

    const result = await pool.query(
      `
      UPDATE alertes
      SET
        resolue = TRUE,
        resolue_le = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Alerte introuvable'
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

module.exports = router;