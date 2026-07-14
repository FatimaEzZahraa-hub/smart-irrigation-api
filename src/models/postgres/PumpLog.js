const pool = require('../../config/postgres');
const { isUuid } = require('../../utils/uuid');

class PumpLog {

    static selectFields(alias = 'pump_logs') {
        return `
            ${alias}.id,
            ${alias}.device_id,
            ${alias}.device_id AS dispositif_id,
            ${alias}.action,
            ${alias}.triggered_by,
            ${alias}.triggered_by AS declenche_par,
            ${alias}.triggered_at,
            ${alias}.triggered_at AS declenche_le
        `;
    }

    static async create({ deviceId, action, triggeredBy = 'manual' }) {
        if (!isUuid(deviceId)) {
            return undefined;
        }

        const result = await pool.query(
            `
            INSERT INTO pump_logs
            (
                device_id,
                action,
                triggered_by
            )
            VALUES ($1,$2,$3)
            RETURNING ${this.selectFields()}
            `,
            [deviceId, action, triggeredBy]
        );

        return result.rows[0];
    }

    static async findByDeviceId(deviceId) {
        if (!isUuid(deviceId)) {
            return [];
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields('pump_logs')}
            FROM pump_logs
            WHERE device_id = $1
            ORDER BY triggered_at DESC
            `,
            [deviceId]
        );

        return result.rows;
    }

    static async findLatestByDeviceId(deviceId) {
        if (!isUuid(deviceId)) {
            return null;
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields('pump_logs')}
            FROM pump_logs
            WHERE device_id = $1
            ORDER BY triggered_at DESC
            LIMIT 1
            `,
            [deviceId]
        );

        return result.rows[0] ?? null;
    }

    static async findByDeviceIdAndUserId(deviceId, userId) {
        if (!isUuid(deviceId) || !isUuid(userId)) {
            return [];
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields('p')}
            FROM pump_logs p
            JOIN devices
            ON p.device_id = devices.id
            WHERE p.device_id = $1
            AND devices.user_id = $2
            ORDER BY p.triggered_at DESC
            `,
            [deviceId, userId]
        );

        return result.rows;
    }

}

module.exports = PumpLog;
