const pool = require('../../config/postgres');
const { isUuid } = require('../../utils/uuid');

class User {

    static async findByEmail(email) {
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                username,
                username AS nom_utilisateur,
                password_hash,
                password_hash AS mot_de_passe_hash,
                active,
                created_at,
                updated_at
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        return result.rows[0];
    }

    static async findById(id) {
        if (!isUuid(id)) {
            return undefined;
        }

        const result = await pool.query(
            `
            SELECT
                id,
                email,
                username,
                username AS nom_utilisateur,
                active,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0];
    }

    static async create(email, username, passwordHash) {
        const result = await pool.query(
            `
            INSERT INTO users
            (
                email,
                username,
                password_hash
            )
            VALUES ($1,$2,$3)
            RETURNING
                id,
                email,
                username,
                username AS nom_utilisateur,
                active,
                created_at,
                updated_at
            `,
            [email, username, passwordHash]
        );

        return result.rows[0];
    }

    static async findPasswordHashById(id) {
        if (!isUuid(id)) {
            return undefined;
        }

        const result = await pool.query(
            `
            SELECT
                id,
                password_hash
            FROM users
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0];
    }

    static async updatePassword(id, passwordHash) {
        const result = await pool.query(
            `
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            RETURNING id
            `,
            [passwordHash, id]
        );

        return result.rows[0];
    }

}

module.exports = User;
