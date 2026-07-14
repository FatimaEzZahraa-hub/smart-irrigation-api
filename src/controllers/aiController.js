const aiRecommendationEngine = require('../services/ai/aiRecommendationEngine');

class AiController {

    async getRecommendation(req, res) {

        try {

            const recommendation = await aiRecommendationEngine.generateRecommendation(
                req.params.deviceId,
                req.user.userId
            );

            return res.json(recommendation);

        } catch (error) {

            if (error.message === 'DEVICE_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Dispositif introuvable'
                });
            }

            console.error('AI recommendation error:', error);

            return res.status(500).json({
                message: 'Erreur serveur'
            });

        }

    }

}

module.exports = new AiController();
