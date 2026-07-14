const pool = require('../../config/postgres');

class Database {

    static async init() {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) NOT NULL UNIQUE,
                    username VARCHAR(100) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS devices (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(150) NOT NULL,
                    location VARCHAR(255),
                    latitude NUMERIC(10,7),
                    longitude NUMERIC(10,7),
                    api_key VARCHAR(255) NOT NULL UNIQUE,
                    mode VARCHAR(20) NOT NULL DEFAULT 'manual',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    last_connection TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT devices_mode_check CHECK (mode IN ('auto', 'manual')),
                    CONSTRAINT devices_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
                    CONSTRAINT devices_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                    alert_type VARCHAR(100) NOT NULL,
                    message TEXT NOT NULL,
                    severity VARCHAR(50) NOT NULL DEFAULT 'warning',
                    resolved BOOLEAN NOT NULL DEFAULT FALSE,
                    resolved_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT alerts_severity_check CHECK (severity IN ('info', 'warning', 'critical'))
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS pump_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                    action VARCHAR(10) NOT NULL,
                    triggered_by VARCHAR(50) NOT NULL DEFAULT 'manual',
                    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT pump_logs_action_check CHECK (action IN ('ON', 'OFF')),
                    CONSTRAINT pump_logs_triggered_by_check CHECK (triggered_by IN ('manual', 'automatic', 'system'))
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS device_settings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    device_id UUID NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
                    humidity_threshold NUMERIC(5,2) NOT NULL DEFAULT 40.0,
                    irrigation_duration_minutes INTEGER NOT NULL DEFAULT 10,
                    is_rain_skip_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT device_settings_humidity_check CHECK (humidity_threshold BETWEEN 10 AND 90),
                    CONSTRAINT device_settings_duration_check CHECK (irrigation_duration_minutes BETWEEN 1 AND 120)
                )
            `);

            await this.addMissingColumns(client);
            await this.addMissingConstraints(client);
            await this.createUpdatedAtTriggers(client);
            await this.createIndexes(client);

            await client.query('COMMIT');
            console.log('✅ Connected to PostgreSQL');
        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('PostgreSQL initialization rollback failed:', rollbackError.message);
            }

            throw error;
        } finally {
            client.release();
        }
    }

    static async addMissingColumns(client) {
        await client.query(`
            ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS plant_name VARCHAR(100);
            ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS planting_date DATE;
        `);
    }

    static async addMissingConstraints(client) {
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'devices_mode_check'
                    AND conrelid = 'devices'::regclass
                ) THEN
                    ALTER TABLE devices
                    ADD CONSTRAINT devices_mode_check
                    CHECK (mode IN ('auto', 'manual'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'devices_latitude_check'
                    AND conrelid = 'devices'::regclass
                ) THEN
                    ALTER TABLE devices
                    ADD CONSTRAINT devices_latitude_check
                    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'devices_longitude_check'
                    AND conrelid = 'devices'::regclass
                ) THEN
                    ALTER TABLE devices
                    ADD CONSTRAINT devices_longitude_check
                    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'alerts_severity_check'
                    AND conrelid = 'alerts'::regclass
                ) THEN
                    ALTER TABLE alerts
                    ADD CONSTRAINT alerts_severity_check
                    CHECK (severity IN ('info', 'warning', 'critical'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'pump_logs_action_check'
                    AND conrelid = 'pump_logs'::regclass
                ) THEN
                    ALTER TABLE pump_logs
                    ADD CONSTRAINT pump_logs_action_check
                    CHECK (action IN ('ON', 'OFF'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'pump_logs_triggered_by_check'
                    AND conrelid = 'pump_logs'::regclass
                ) THEN
                    ALTER TABLE pump_logs
                    ADD CONSTRAINT pump_logs_triggered_by_check
                    CHECK (triggered_by IN ('manual', 'automatic', 'system'));
                END IF;
            END
            $$;
        `);
    }

    static async createUpdatedAtTriggers(client) {
        await client.query(`
            CREATE OR REPLACE FUNCTION refresh_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_users_refresh_updated_at ON users;
            CREATE TRIGGER trg_users_refresh_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION refresh_updated_at();

            DROP TRIGGER IF EXISTS trg_devices_refresh_updated_at ON devices;
            CREATE TRIGGER trg_devices_refresh_updated_at
            BEFORE UPDATE ON devices
            FOR EACH ROW
            EXECUTE FUNCTION refresh_updated_at();

            DROP TRIGGER IF EXISTS trg_device_settings_refresh_updated_at ON device_settings;
            CREATE TRIGGER trg_device_settings_refresh_updated_at
            BEFORE UPDATE ON device_settings
            FOR EACH ROW
            EXECUTE FUNCTION refresh_updated_at();
        `);
    }

    static async createIndexes(client) {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
            CREATE INDEX IF NOT EXISTS idx_devices_user_created_at ON devices(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_device_created_at ON alerts(device_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_pump_logs_device_id ON pump_logs(device_id);
            CREATE INDEX IF NOT EXISTS idx_pump_logs_device_triggered_at ON pump_logs(device_id, triggered_at DESC);
            CREATE INDEX IF NOT EXISTS idx_device_settings_device_id ON device_settings(device_id);
        `);
    }

}

module.exports = Database;
