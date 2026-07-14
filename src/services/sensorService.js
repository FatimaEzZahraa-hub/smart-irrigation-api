const Device = require('../models/postgres/Device');
const SensorReading = require('../models/mongo/SensorReading');
const irrigationEmitter = require('../utils/irrigationEmitter');

class SensorService {

    async storeReading(payload) {

        const {
            apiKey,
            humidite_sol,
            temperature,
            humidite_air
        } = payload;

        const device = await Device.findByApiKey(apiKey);

        if (!device) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        const reading = await SensorReading.createReading({
            deviceId: device.id,
            soilMoisture: humidite_sol,
            temperature,
            airHumidity: humidite_air
        });

        irrigationEmitter.emit('sensor:reading', { deviceId: device.id, reading });

        return reading;

    }

    async getLatestReading(deviceId, userId) {

        const device = await Device.findByIdAndUserId(deviceId, userId);

        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        const reading = await SensorReading.findLatestByDeviceId(deviceId);

        if (!reading) {
            throw new Error('NO_SENSOR_DATA');
        }

        return this.formatReading(reading);
    }

    async getHistory(deviceId, userId, filters = {}) {

        const device = await Device.findByIdAndUserId(deviceId, userId);

        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        const cleanFilters = this.normalizeHistoryFilters(filters);
        const readings = await SensorReading.findHistoryByDeviceId(deviceId, cleanFilters);

        return readings.map((reading) => this.formatReading(reading, cleanFilters.type));

    }

    normalizeHistoryFilters(filters) {

        const type = ['soil', 'air', 'temperature'].includes(filters.type)
            ? filters.type
            : 'all';

        return {
            startDate: this.parseDateFilter(filters.startDate),
            endDate: this.parseDateFilter(filters.endDate),
            type
        };

    }

    parseDateFilter(value) {

        if (!value) {
            return undefined;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error('INVALID_DATE');
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            throw new Error('INVALID_DATE');
        }

        return value;

    }

    formatReading(reading, type = 'all') {

        return {
            id: reading._id,
            dispositif_id: reading.deviceId,
            humidite_sol: reading.soilMoisture,
            temperature: reading.temperature,
            humidite_air: reading.airHumidity,
            enregistre_le: reading.createdAt,
            metric_type: type,
            metric_value: this.getMetricValue(reading, type)
        };

    }

    getMetricValue(reading, type) {

        if (type === 'air') {
            return reading.airHumidity;
        }

        if (type === 'temperature') {
            return reading.temperature;
        }

        return reading.soilMoisture;

    }

}

module.exports = new SensorService();
