const pool = require('../../config/postgres');
const { isUuid } = require('../../utils/uuid');

class Alert {

    static selectFields(alias = 'a') {
        return `
            ${alias}.id,
            ${alias}.device_id,
            ${alias}.device_id AS dispositif_id,
            ${alias}.alert_type,
            ${alias}.alert_type AS type_alerte,
            ${alias}.message,
            ${alias}.severity,
            ${alias}.severity AS severite,
            ${alias}.resolved,
            ${alias}.resolved AS resolue,
            ${alias}.resolved_at,
            ${alias}.resolved_at AS resolue_le,
            ${alias}.created_at,
            ${alias}.created_at AS cree_le
        `;
    }

    static async findAllByUserId(userId) {
        if (!isUuid(userId)) {
            return [];
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields('a')}
            FROM alerts a
            JOIN devices d
            ON a.device_id = d.id
            WHERE d.user_id = $1
            ORDER BY a.created_at DESC
            `,
            [userId]
        );

        return result.rows;
    }

    static async create({ deviceId, alertType, message, severity }) {
        const result = await pool.query(
            `
            INSERT INTO alerts
            (
                device_id,
                alert_type,
                message,
                severity
            )
            VALUES ($1,$2,$3,$4)
            RETURNING ${this.selectFields('alerts')}
            `,
            [deviceId, alertType, message, severity || 'warning']
        );

        return result.rows[0];
    }

    static async resolveByIdAndUserId(id, userId) {
        if (!isUuid(id) || !isUuid(userId)) {
            return undefined;
        }

        const result = await pool.query(
            `
            UPDATE alerts
            SET
                resolved = TRUE,
                resolved_at = NOW()
            WHERE id = $1
            AND EXISTS (
                SELECT 1
                FROM devices
                WHERE devices.id = alerts.device_id
                AND devices.user_id = $2
            )
            RETURNING ${this.selectFields('alerts')}
            `,
            [id, userId]
        );

        return result.rows[0];
    }

}

module.exports = Alert;
