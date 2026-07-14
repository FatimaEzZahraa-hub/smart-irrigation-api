const jwt = require('jsonwebtoken');
const { isUuid } = require('../utils/uuid');

module.exports = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Configuration auth manquante'
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Token manquant'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!isUuid(decoded.userId)) {
      return res.status(401).json({
        message: 'Token invalide'
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Token invalide'
    });
  }
};

