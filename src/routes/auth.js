const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      nom_utilisateur,
      mot_de_passe
    } = req.body;

    // vérifier email
    const existingUser = await pool.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: 'Email déjà utilisé'
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(
      mot_de_passe,
      10
    );

    // insert user
    const result = await pool.query(
      `
      INSERT INTO utilisateurs
      (
        email,
        nom_utilisateur,
        mot_de_passe_hash
      )
      VALUES ($1, $2, $3)
      RETURNING id, email, nom_utilisateur
      `,
      [
        email,
        nom_utilisateur,
        hashedPassword
      ]
    );

    res.status(201).json({
      message: 'Utilisateur créé',
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    const result = await pool.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      message: 'Connexion réussie',
      token
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

const authMiddleware = require('../middleware/auth');

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        email,
        nom_utilisateur
      FROM utilisateurs
      WHERE id = $1
      `,
      [req.user.userId]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;