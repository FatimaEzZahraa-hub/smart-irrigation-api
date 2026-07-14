const pool = require('../../config/postgres');
const { isUuid } = require('../../utils/uuid');

class DeviceSettings {

    static selectFields() {
        return `
            id,
            device_id,
            device_id AS dispositif_id,
            humidity_threshold,
            humidity_threshold AS seuil_humidite,
            irrigation_duration_minutes,
            irrigation_duration_minutes AS duree_irrigation_minutes,
            is_rain_skip_enabled,
            is_rain_skip_enabled AS ignorer_si_pluie,
            plant_name,
            plant_name AS nom_culture,
            planting_date,
            planting_date AS date_plantation,
            created_at,
            created_at AS cree_le,
            updated_at,
            updated_at AS mis_a_jour_le
        `;
    }

    static async findByDeviceId(deviceId) {

        if (!isUuid(deviceId)) {
            return null;
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields()}
            FROM device_settings
            WHERE device_id = $1
            `,
            [deviceId]
        );

        return result.rows[0] ?? null;

    }

    static async upsert({ deviceId, humidityThreshold, irrigationDurationMinutes, isRainSkipEnabled, plantName, plantingDate }) {

        if (!isUuid(deviceId)) {
            return null;
        }

        const result = await pool.query(
            `
            INSERT INTO device_settings
            (
                device_id,
                humidity_threshold,
                irrigation_duration_minutes,
                is_rain_skip_enabled,
                plant_name,
                planting_date
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (device_id) DO UPDATE SET
                humidity_threshold = EXCLUDED.humidity_threshold,
                irrigation_duration_minutes = EXCLUDED.irrigation_duration_minutes,
                is_rain_skip_enabled = EXCLUDED.is_rain_skip_enabled,
                plant_name = EXCLUDED.plant_name,
                planting_date = EXCLUDED.planting_date
            RETURNING ${this.selectFields()}
            `,
            [deviceId, humidityThreshold, irrigationDurationMinutes, isRainSkipEnabled, plantName ?? null, plantingDate ?? null]
        );

        return result.rows[0];

    }

}

module.exports = DeviceSettings;
