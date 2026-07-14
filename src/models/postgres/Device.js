const pool = require('../../config/postgres');
const { isUuid } = require('../../utils/uuid');

class Device {

    static selectFields() {
        return `
            id,
            user_id,
            user_id AS utilisateur_id,
            name,
            name AS nom,
            location,
            location AS emplacement,
            latitude,
            longitude,
            api_key,
            api_key AS cle_api,
            mode,
            is_active,
            is_active AS est_actif,
            last_connection,
            last_connection AS derniere_connexion,
            created_at,
            created_at AS cree_le,
            updated_at,
            updated_at AS mis_a_jour_le
        `;
    }

    static async findByApiKey(apiKey) {

        const result = await pool.query(
            `
            SELECT ${this.selectFields()}
            FROM devices
            WHERE api_key = $1
            `,
            [apiKey]
        );

        return result.rows[0];

    }

    static async findById(id) {

        if (!isUuid(id)) {
            return undefined;
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields()}
            FROM devices
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0];

    }

    static async findByIdAndUserId(id, userId) {

        if (!isUuid(id) || !isUuid(userId)) {
            return undefined;
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields()}
            FROM devices
            WHERE id = $1
            AND user_id = $2
            `,
            [id, userId]
        );

        return result.rows[0];

    }

    static async create({ userId, name, location, latitude, longitude, apiKey }) {

        const result = await pool.query(
            `
            INSERT INTO devices
            (
                user_id,
                name,
                location,
                latitude,
                longitude,
                api_key
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING ${this.selectFields()}
            `,
            [userId, name, location, latitude, longitude, apiKey]
        );

        return result.rows[0];

    }

    static async findAllByUserId(userId) {

        if (!isUuid(userId)) {
            return [];
        }

        const result = await pool.query(
            `
            SELECT ${this.selectFields()}
            FROM devices
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        return result.rows;

    }

    static async updateMode(deviceId, userId, mode) {

        if (!isUuid(deviceId) || !isUuid(userId)) {
            return null;
        }

        if (!['manual', 'auto'].includes(mode)) {
            return null;
        }

        const result = await pool.query(
            `
            UPDATE devices
            SET mode = $3
            WHERE id = $1
            AND user_id = $2
            RETURNING ${this.selectFields()}
            `,
            [deviceId, userId, mode]
        );

        return result.rows[0];

    }

    static async updateByIdAndUserId(deviceId, userId, updates) {

        if (!isUuid(deviceId) || !isUuid(userId)) {
            return null;
        }

        const allowed = ['name', 'location', 'latitude', 'longitude'];
        const params = [deviceId, userId];
        const setClauses = [];

        for (const field of allowed) {
            if (updates[field] !== undefined) {
                params.push(updates[field]);
                setClauses.push(`${field} = $${params.length}`);
            }
        }

        if (setClauses.length === 0) {
            return null;
        }

        const result = await pool.query(
            `
            UPDATE devices
            SET ${setClauses.join(', ')}
            WHERE id = $1
            AND user_id = $2
            RETURNING ${this.selectFields()}
            `,
            params
        );

        return result.rows[0];

    }

    static async deleteByIdAndUserId(deviceId, userId) {

        if (!isUuid(deviceId) || !isUuid(userId)) {
            return false;
        }

        const result = await pool.query(
            `
            DELETE FROM devices
            WHERE id = $1
            AND user_id = $2
            `,
            [deviceId, userId]
        );

        return result.rowCount > 0;

    }

}

module.exports = Device;
