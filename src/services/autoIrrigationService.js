const irrigationEmitter = require('../utils/irrigationEmitter');
const Device = require('../models/postgres/Device');
const PumpLog = require('../models/postgres/PumpLog');
const DeviceSettings = require('../models/postgres/DeviceSettings');
const Alert = require('../models/postgres/Alert');
const weatherService = require('./weatherService');

class AutoIrrigationService {

    startListening() {
        irrigationEmitter.on('sensor:reading', ({ deviceId, reading }) => {
            this.evaluate(deviceId, reading).catch((error) => {
                console.error('AutoIrrigationService evaluate error:', error);
            });
        });
    }

    async evaluate(deviceId, reading) {
        const device = await Device.findById(deviceId);

        if (!device) {
            return;
        }

        if (device.is_active === false) {
            return;
        }

        if (device.mode !== 'auto') {
            return;
        }

        const latestLog = await PumpLog.findLatestByDeviceId(deviceId);

        if (latestLog && latestLog.action === 'ON') {
            const settings = await DeviceSettings.findByDeviceId(deviceId);
            const duration = settings ? settings.irrigation_duration_minutes : 10;

            const elapsedMinutes = (Date.now() - new Date(latestLog.triggered_at).getTime()) / 60000;

            if (elapsedMinutes >= duration) {
                await PumpLog.create({ deviceId, action: 'OFF', triggeredBy: 'automatic' });
                await Alert.create({
                    deviceId,
                    alertType: 'irrigation_complete',
                    message: `Irrigation automatique terminée après ${duration} minutes`,
                    severity: 'info'
                });
            }

            return;
        }

        const settings = await DeviceSettings.findByDeviceId(deviceId);
        const threshold = settings ? Number(settings.humidity_threshold) : 40;

        if (reading.soilMoisture >= threshold) {
            return;
        }

        const isRainSkipEnabled = settings ? settings.is_rain_skip_enabled : false;

        if (isRainSkipEnabled) {
            const latitude = Number(device.latitude);
            const longitude = Number(device.longitude);

            if (
                Number.isFinite(latitude) && Number.isFinite(longitude) &&
                latitude >= -90 && latitude <= 90 &&
                longitude >= -180 && longitude <= 180
            ) {
                try {
                    const weather = await weatherService.fetchOpenWeather(latitude, longitude);
                    const rainPredicted = weather.forecast.some(
                        (item) => item.description.toLowerCase().includes('rain')
                    );

                    if (rainPredicted) {
                        await Alert.create({
                            deviceId,
                            alertType: 'rain_skip',
                            message: 'Irrigation ignorée : pluie prévue dans les prochaines heures',
                            severity: 'info'
                        });
                        return;
                    }
                } catch (error) {
                    console.error('AutoIrrigationService weather error:', error);
                }
            }
        }

        await PumpLog.create({ deviceId, action: 'ON', triggeredBy: 'automatic' });
        await Alert.create({
            deviceId,
            alertType: 'irrigation_start',
            message: 'Irrigation automatique déclenchée',
            severity: 'info'
        });
    }

}

module.exports = new AutoIrrigationService();
