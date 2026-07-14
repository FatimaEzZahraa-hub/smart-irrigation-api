const weatherService = require('../services/weatherService');

class WeatherController {

    async getZoneWeather(req, res) {

        try {
            const weather = await weatherService.getZoneWeather(
                req.params.zoneId,
                req.user.userId
            );

            return res.json(weather);
        } catch (error) {
            if (error.message === 'DEVICE_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Zone introuvable'
                });
            }

            if (
                error.message === 'MISSING_COORDINATES' ||
                error.message === 'INVALID_COORDINATES'
            ) {
                return res.status(400).json({
                    message: 'Coordonnees de zone manquantes'
                });
            }

            if (error.message === 'MISSING_OPENWEATHER_CONFIG') {
                return res.status(500).json({
                    message: 'Configuration meteo manquante'
                });
            }

            console.error('Weather API error:', error.message);

            return res.status(503).json({
                message: 'Service meteo indisponible'
            });
        }

    }

}

module.exports = new WeatherController();
