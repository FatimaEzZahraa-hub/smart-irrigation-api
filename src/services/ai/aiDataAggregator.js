const Device = require('../../models/postgres/Device');
const DeviceSettings = require('../../models/postgres/DeviceSettings');
const PumpLog = require('../../models/postgres/PumpLog');
const Alert = require('../../models/postgres/Alert');
const SensorReading = require('../../models/mongo/SensorReading');
const weatherService = require('../weatherService');
const {
    isDemoMode,
    getDemoLatestReading,
    getDemoWeather,
    getDemoPumpHistory
} = require('../../utils/demo');

const DEFAULT_HUMIDITY_THRESHOLD = 40;
const DEFAULT_DURATION_MINUTES = 10;
const RECENT_ALERTS_LIMIT = 5;

class AiDataAggregator {

    async collectContext(deviceId, userId) {
        if (isDemoMode()) {
            return this.buildDemoContext(deviceId);
        }

        const device = await Device.findByIdAndUserId(deviceId, userId);

        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        const warnings = [];

        const [sensor, settings, pump, alerts] = await Promise.all([
            this.readLatestSensor(deviceId, warnings),
            this.readSettings(deviceId, warnings),
            this.readPumpStatus(deviceId, warnings),
            this.readRecentAlerts(deviceId, userId, warnings)
        ]);

        const weather = await this.readWeather(device, warnings);

        return {
            deviceId,
            device: {
                id: device.id,
                name: device.name,
                latitude: device.latitude,
                longitude: device.longitude
            },
            sensor,
            settings,
            pump,
            weather,
            alerts,
            warnings
        };
    }

    async readLatestSensor(deviceId, warnings) {
        try {
            const reading = await SensorReading.findLatestByDeviceId(deviceId);

            if (!reading) {
                warnings.push('SENSOR_UNAVAILABLE');
                return null;
            }

            return {
                soilMoisture: reading.soilMoisture,
                temperature: reading.temperature,
                airHumidity: reading.airHumidity,
                recordedAt: reading.createdAt
            };
        } catch (error) {
            warnings.push('SENSOR_UNAVAILABLE');
            return null;
        }
    }

    async readSettings(deviceId, warnings) {
        try {
            const settings = await DeviceSettings.findByDeviceId(deviceId);

            return {
                humidityThreshold: settings ? Number(settings.humidity_threshold) : DEFAULT_HUMIDITY_THRESHOLD,
                irrigationDurationMinutes: settings ? settings.irrigation_duration_minutes : DEFAULT_DURATION_MINUTES,
                isRainSkipEnabled: settings ? !!settings.is_rain_skip_enabled : false,
                plantName: settings ? settings.plant_name : null
            };
        } catch (error) {
            warnings.push('SETTINGS_UNAVAILABLE');
            return {
                humidityThreshold: DEFAULT_HUMIDITY_THRESHOLD,
                irrigationDurationMinutes: DEFAULT_DURATION_MINUTES,
                isRainSkipEnabled: false,
                plantName: null
            };
        }
    }

    async readPumpStatus(deviceId, warnings) {
        try {
            const latest = await PumpLog.findLatestByDeviceId(deviceId);

            if (!latest) {
                return { status: 'OFF', triggeredAt: null, elapsedMinutes: null };
            }

            const triggeredAt = new Date(latest.triggered_at);
            const elapsedMinutes = (Date.now() - triggeredAt.getTime()) / 60000;

            return {
                status: latest.action,
                triggeredAt,
                elapsedMinutes: Number.isFinite(elapsedMinutes) ? elapsedMinutes : null
            };
        } catch (error) {
            warnings.push('PUMP_STATUS_UNAVAILABLE');
            return { status: null, triggeredAt: null, elapsedMinutes: null };
        }
    }

    async readRecentAlerts(deviceId, userId, warnings) {
        try {
            const alerts = await Alert.findAllByUserId(userId);

            return alerts
                .filter((alert) => alert.device_id === deviceId)
                .slice(0, RECENT_ALERTS_LIMIT)
                .map((alert) => ({
                    alertType: alert.alert_type,
                    severity: alert.severity,
                    resolved: alert.resolved,
                    createdAt: alert.created_at
                }));
        } catch (error) {
            warnings.push('ALERTS_UNAVAILABLE');
            return [];
        }
    }

    async readWeather(device, warnings) {
        const latitude = Number(device.latitude);
        const longitude = Number(device.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            warnings.push('WEATHER_UNAVAILABLE');
            return null;
        }

        try {
            return await weatherService.fetchOpenWeather(latitude, longitude);
        } catch (error) {
            warnings.push('WEATHER_UNAVAILABLE');
            return null;
        }
    }

    buildDemoContext(deviceId) {
        const reading = getDemoLatestReading(deviceId);
        const weather = getDemoWeather('Zone agricole');
        const pumpHistory = getDemoPumpHistory(deviceId);
        const latest = pumpHistory[0] || null;

        let pump = { status: 'OFF', triggeredAt: null, elapsedMinutes: null };

        if (latest) {
            const triggeredAt = new Date(latest.triggered_at);
            pump = {
                status: latest.action,
                triggeredAt,
                elapsedMinutes: (Date.now() - triggeredAt.getTime()) / 60000
            };
        }

        return {
            deviceId,
            device: {
                id: deviceId,
                name: 'Zone A - Démo',
                latitude: 33.5731,
                longitude: -7.5898
            },
            sensor: {
                soilMoisture: reading.humidite_sol,
                temperature: reading.temperature,
                airHumidity: reading.humidite_air,
                recordedAt: reading.enregistre_le
            },
            settings: {
                humidityThreshold: DEFAULT_HUMIDITY_THRESHOLD,
                irrigationDurationMinutes: DEFAULT_DURATION_MINUTES,
                isRainSkipEnabled: true,
                plantName: 'Démo'
            },
            pump,
            weather,
            alerts: [],
            warnings: []
        };
    }

}

module.exports = new AiDataAggregator();
