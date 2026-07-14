const https = require('https');
const Device = require('../models/postgres/Device');
const { isDemoMode, getDemoWeather } = require('../utils/demo');

class WeatherService {

    async getZoneWeather(zoneId, userId) {

        if (isDemoMode()) {
            const device = await Device.findByIdAndUserId(zoneId, userId);
            const location = device?.name || device?.location || 'Zone agricole';
            return getDemoWeather(location);
        }

        const device = await Device.findByIdAndUserId(zoneId, userId);

        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        const coordinates = this.getCoordinates(device);
        const weather = await this.fetchOpenWeather(
            coordinates.latitude,
            coordinates.longitude
        );

        return {
            location: device.name || device.location || 'Zone agricole',
            temperature: weather.temperature,
            humidity: weather.humidity,
            description: weather.description,
            windSpeed: weather.windSpeed,
            icon: weather.icon,
            forecast: weather.forecast
        };

    }

    getCoordinates(device) {

        const latitude = Number(device.latitude);
        const longitude = Number(device.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('MISSING_COORDINATES');
        }

        if (!this.isValidLatitude(latitude) || !this.isValidLongitude(longitude)) {
            throw new Error('INVALID_COORDINATES');
        }

        return {
            latitude,
            longitude
        };

    }

    isValidLatitude(value) {

        return value >= -90 && value <= 90;

    }

    isValidLongitude(value) {

        return value >= -180 && value <= 180;

    }

    async fetchOpenWeather(latitude, longitude) {

        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            throw new Error('MISSING_OPENWEATHER_CONFIG');
        }

        const params = new URLSearchParams({
            lat: String(latitude),
            lon: String(longitude),
            appid: apiKey,
            units: 'metric'
        });

        const [current, forecast] = await Promise.all([
            this.getJson(`https://api.openweathermap.org/data/2.5/weather?${params}`),
            this.getJson(`https://api.openweathermap.org/data/2.5/forecast?${params}`)
        ]);

        return this.formatOpenWeather(current, forecast);

    }

    formatOpenWeather(current, forecast) {

        return {
            temperature: Math.round(current.main.temp),
            humidity: current.main.humidity,
            description: current.weather?.[0]?.description || '',
            windSpeed: Math.round((current.wind?.speed || 0) * 3.6),
            icon: current.weather?.[0]?.icon || '',
            forecast: (forecast.list || []).slice(0, 5).map((item) => ({
                time: item.dt_txt,
                temperature: Math.round(item.main.temp),
                description: item.weather?.[0]?.description || '',
                icon: item.weather?.[0]?.icon || ''
            }))
        };

    }

    getJson(url) {

        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                let body = '';

                response.on('data', (chunk) => {
                    body += chunk;
                });

                response.on('end', () => {
                    try {
                        const payload = JSON.parse(body);

                        if (response.statusCode < 200 || response.statusCode >= 300) {
                            reject(new Error(payload.message || 'OpenWeather request failed'));
                            return;
                        }

                        resolve(payload);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            request.setTimeout(10000, () => {
                request.destroy(new Error('OpenWeather request timeout'));
            });

            request.on('error', reject);
        });

    }

}

module.exports = new WeatherService();
