const express = require('express');
const https = require('https');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const coordinateFields = {
  latitude: ['latitude', 'lat', 'zone_latitude', 'emplacement_latitude'],
  longitude: ['longitude', 'lng', 'lon', 'zone_longitude', 'emplacement_longitude']
};

router.get('/:zoneId', authMiddleware, async (req, res) => {
  try {
    const { zoneId } = req.params;

    const zoneResult = await pool.query(
      `
      SELECT *
      FROM dispositifs
      WHERE id = $1
      AND utilisateur_id = $2
      `,
      [zoneId, req.user.userId]
    );

    if (zoneResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Zone introuvable'
      });
    }

    const zone = zoneResult.rows[0];
    const latitude = getNumberField(zone, coordinateFields.latitude);
    const longitude = getNumberField(zone, coordinateFields.longitude);

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        message: 'Coordonnees de zone manquantes'
      });
    }

    if (!process.env.OPENWEATHER_API_KEY) {
      return res.status(500).json({
        message: 'Configuration meteo manquante'
      });
    }

    const weather = await fetchOpenWeather(latitude, longitude);

    res.json({
      location: zone.nom || zone.emplacement || 'Zone agricole',
      temperature: weather.temperature,
      humidity: weather.humidity,
      description: weather.description,
      windSpeed: weather.windSpeed,
      icon: weather.icon,
      forecast: weather.forecast
    });
  } catch (error) {
    console.error('Weather API error:', error.message);

    res.status(503).json({
      message: 'Service meteo indisponible'
    });
  }
});

function getNumberField(source, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = source[fieldName];

    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

async function fetchOpenWeather(latitude, longitude) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const params = `lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
  const [current, forecast] = await Promise.all([
    getJson(`https://api.openweathermap.org/data/2.5/weather?${params}`),
    getJson(`https://api.openweathermap.org/data/2.5/forecast?${params}`)
  ]);

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

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
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
      })
      .on('error', reject);
  });
}

module.exports = router;
