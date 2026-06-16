const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

// Ajouter un dispositif
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nom, emplacement } = req.body;

    const cle_api = crypto.randomBytes(16).toString('hex');

    const result = await pool.query(
      `
      INSERT INTO dispositifs
      (
        utilisateur_id,
        nom,
        emplacement,
        cle_api
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        req.user.userId,
        nom,
        emplacement,
        cle_api
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

// Liste des dispositifs de l'utilisateur
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM dispositifs
      WHERE utilisateur_id = $1
      ORDER BY cree_le DESC
      `,
      [req.user.userId]
    );

    res.json(result.rows);

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

    const result = await pool.query(
      `
      SELECT *
      FROM dispositifs
      WHERE id = $1
      AND utilisateur_id = $2
      `,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Dispositif introuvable'
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