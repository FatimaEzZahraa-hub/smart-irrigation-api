function isDemoMode() {
    return process.env.DEMO_MODE === 'true';
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function fmtDatetime(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// 20 readings spread across the past 80 hours (every 4 h), giving data for
// "today", "week", and "month" analytics filters.
function getDemoLatestReading(deviceId) {
    return {
        id: 'demo-reading-001',
        dispositif_id: deviceId,
        humidite_sol: 42,
        temperature: 24,
        humidite_air: 65,
        enregistre_le: new Date().toISOString(),
        metric_type: 'all',
        metric_value: 42
    };
}

function getDemoHistory(deviceId, type) {
    const resolvedType = ['soil', 'air', 'temperature'].includes(type) ? type : 'all';
    const readings = [];
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
        const ts = new Date(now - i * 4 * 60 * 60 * 1000);
        const soilMoisture = Math.round(40 + Math.sin(i * 0.7) * 12);
        const temperature  = Math.round(24 + Math.sin(i * 0.5) * 5);
        const airHumidity  = Math.round(62 + Math.cos(i * 0.6) * 8);

        const metricValue = resolvedType === 'temperature' ? temperature
                          : resolvedType === 'air'         ? airHumidity
                          :                                  soilMoisture;

        readings.push({
            id: `demo-${i + 1}`,
            dispositif_id: deviceId,
            humidite_sol: soilMoisture,
            temperature,
            humidite_air: airHumidity,
            enregistre_le: ts.toISOString(),
            metric_type: resolvedType,
            metric_value: metricValue
        });
    }

    return readings;
}

// 4 pump sessions (ON/OFF pairs) spread over the past 3 days.
function getDemoPumpHistory(deviceId) {
    const now = Date.now();
    const sessions = [
        { start: now - 3 * 24 * 60 * 60 * 1000, durationMs: 45 * 60 * 1000 },
        { start: now - 2 * 24 * 60 * 60 * 1000, durationMs: 30 * 60 * 1000 },
        { start: now - 1 * 24 * 60 * 60 * 1000, durationMs: 60 * 60 * 1000 },
        { start: now - 2 * 60 * 60 * 1000,       durationMs: 20 * 60 * 1000 }
    ];

    const entries = [];
    let counter = 1;

    for (const s of sessions) {
        const onTs  = new Date(s.start).toISOString();
        const offTs = new Date(s.start + s.durationMs).toISOString();

        entries.push({
            id: `demo-pump-${counter++}`,
            device_id: deviceId,
            dispositif_id: deviceId,
            action: 'ON',
            triggered_by: 'automatic',
            declenche_par: 'automatic',
            triggered_at: onTs,
            declenche_le: onTs
        });
        entries.push({
            id: `demo-pump-${counter++}`,
            device_id: deviceId,
            dispositif_id: deviceId,
            action: 'OFF',
            triggered_by: 'automatic',
            declenche_par: 'automatic',
            triggered_at: offTs,
            declenche_le: offTs
        });
    }

    // Newest first — matches real backend ordering
    return entries.sort(
        (a, b) => new Date(b.declenche_le).getTime() - new Date(a.declenche_le).getTime()
    );
}

// Forecast: 5 entries, 3 h apart starting from now.
function getDemoWeather(location) {
    const now = new Date();
    const forecast = [];

    for (let i = 0; i < 5; i++) {
        const slot = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
        const temp = Math.round(24 + Math.sin((slot.getHours() - 6) * Math.PI / 12) * 6);
        const icons = ['01d', '02d', '03d', '02d', '01d'];

        forecast.push({
            time: fmtDatetime(slot),
            temperature: temp,
            description: i === 0 ? 'ciel dégagé' : i === 2 ? 'partiellement nuageux' : 'quelques nuages',
            icon: icons[i % icons.length]
        });
    }

    return {
        location: location || 'Zone agricole',
        temperature: 26,
        humidity: 58,
        description: 'ciel dégagé',
        windSpeed: 12,
        icon: '01d',
        forecast
    };
}

// Single demo device — gives the dashboard a real zone ID to work with.
// UUID passes the isUuid() validator so all downstream lookups are consistent.
const DEMO_DEVICE_ID = '00000000-0000-4000-8000-000000000001';

function getDemoDevices() {
    return [
        {
            id: DEMO_DEVICE_ID,
            user_id: null,
            utilisateur_id: null,
            name: 'Zone A - Démo',
            nom: 'Zone A - Démo',
            location: 'Champ principal',
            emplacement: 'Champ principal',
            latitude: 33.5731,
            longitude: -7.5898,
            api_key: 'demo-api-key-000',
            cle_api: 'demo-api-key-000',
            mode: 'manual',
            is_active: true,
            est_actif: true,
            last_connection: null,
            derniere_connexion: null,
            created_at: new Date().toISOString(),
            cree_le: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            mis_a_jour_le: new Date().toISOString()
        }
    ];
}

module.exports = {
    isDemoMode,
    getDemoLatestReading,
    getDemoHistory,
    getDemoPumpHistory,
    getDemoWeather,
    getDemoDevices
};
