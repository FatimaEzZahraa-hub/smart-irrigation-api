const sensorService = require('../services/sensorService');
const { isDemoMode, getDemoLatestReading, getDemoHistory } = require('../utils/demo');

class SensorController {

    async storeReading(req, res) {

        try {

            await sensorService.storeReading(req.body);

            return res.status(201).json({
                message: "Sensor data stored successfully"
            });

        } catch (error) {

            if (error.message === "DEVICE_NOT_FOUND") {
                return res.status(404).json({
                    message: "Device not found"
                });
            }

            console.error(error);

            return res.status(500).json({
                message: "Internal server error"
            });

        }

    }

    async getLatestReading(req, res) {

        if (isDemoMode()) {
            return res.json(getDemoLatestReading(req.params.deviceId));
        }

        try {

            const reading = await sensorService.getLatestReading(
                req.params.deviceId,
                req.user.userId
            );

            res.json(reading);

        } catch (error) {

            if (error.message === 'NO_SENSOR_DATA') {

                return res.status(404).json({
                    message: 'No sensor data found'
                });

            }

            console.error(error);

            res.status(500).json({
                message: 'Internal server error'
            });

        }

    }

    async getHistory(req, res) {

        if (isDemoMode()) {
            const { type } = req.query;
            return res.json(getDemoHistory(req.params.deviceId, type));
        }

        try {

            const {
                startDate,
                endDate,
                type
            } = req.query;

            const history = await sensorService.getHistory(
                req.params.deviceId,
                req.user.userId,
                {
                    startDate,
                    endDate,
                    type
                }
            );

            return res.json(history);

        } catch (error) {

            if (error.message === 'DEVICE_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Device not found'
                });
            }

            if (error.message === 'INVALID_DATE') {
                return res.status(400).json({
                    message: 'Invalid date format'
                });
            }

            console.error(error);

            return res.status(500).json({
                message: 'Internal server error'
            });

        }

    }

}

module.exports = new SensorController();
