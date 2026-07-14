const cron = require('node-cron');
const pool = require('../config/postgres');
const PumpLog = require('../models/postgres/PumpLog');
const DeviceSettings = require('../models/postgres/DeviceSettings');
const Alert = require('../models/postgres/Alert');

async function runSafetyCheck() {
    const result = await pool.query(
        `SELECT id FROM devices WHERE is_active = TRUE AND mode = 'auto'`
    );

    for (const row of result.rows) {
        const deviceId = row.id;

        try {
            const latestLog = await PumpLog.findLatestByDeviceId(deviceId);

            if (!latestLog || latestLog.action !== 'ON') {
                continue;
            }

            const settings = await DeviceSettings.findByDeviceId(deviceId);
            const duration = settings ? settings.irrigation_duration_minutes : 10;

            const elapsedMinutes = (Date.now() - new Date(latestLog.triggered_at).getTime()) / 60000;

            if (elapsedMinutes >= duration) {
                await PumpLog.create({ deviceId, action: 'OFF', triggeredBy: 'system' });
                await Alert.create({
                    deviceId,
                    alertType: 'safety_stop',
                    message: `Arrêt de sécurité : pompe active depuis ${Math.round(elapsedMinutes)} minutes`,
                    severity: 'warning'
                });
            }
        } catch (error) {
            console.error(`IrrigationSafetyJob error for device ${deviceId}:`, error);
        }
    }
}

function start() {
    cron.schedule('*/5 * * * *', () => {
        runSafetyCheck().catch((error) => {
            console.error('IrrigationSafetyJob runSafetyCheck error:', error);
        });
    });
}

module.exports = { start };
