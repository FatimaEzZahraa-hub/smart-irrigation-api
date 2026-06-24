function buildHistoryQuery(deviceId, { startDate, endDate, type = 'all' }) {
  const values = [deviceId];
  const conditions = ['dispositif_id = $1'];

  if (startDate) {
    values.push(startDate);
    conditions.push(`enregistre_le >= $${values.length}::date`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`enregistre_le < ($${values.length}::date + interval '1 day')`);
  }

  if (type === 'soil') {
    conditions.push('humidite_sol IS NOT NULL');
  } else if (type === 'air') {
    conditions.push('humidite_air IS NOT NULL');
  } else if (type === 'temperature') {
    conditions.push('temperature IS NOT NULL');
  }

  values.push(type);
  const typeParam = `$${values.length}`;

  return {
    text: `
      SELECT
        id,
        dispositif_id,
        humidite_sol,
        temperature,
        humidite_air,
        enregistre_le,
        ${typeParam} AS metric_type,
        CASE
          WHEN ${typeParam} = 'soil' THEN humidite_sol
          WHEN ${typeParam} = 'air' THEN humidite_air
          WHEN ${typeParam} = 'temperature' THEN temperature
          ELSE humidite_sol
        END AS metric_value
      FROM donnees_capteurs
      WHERE ${conditions.join(' AND ')}
      ORDER BY enregistre_le DESC
      LIMIT 100
      `,
    values
  };
}

module.exports = { buildHistoryQuery };
