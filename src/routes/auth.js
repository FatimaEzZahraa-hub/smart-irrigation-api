const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/profile', authMiddleware, authController.profile);

router.patch('/change-password', authMiddleware, authController.changePassword);

module.exports = router;