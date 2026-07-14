const ACTIONS = {
    WATER_NOW: 'WATER_NOW',
    DELAY_RAIN_EXPECTED: 'DELAY_RAIN_EXPECTED',
    NO_ACTION_NEEDED: 'NO_ACTION_NEEDED',
    IRRIGATION_IN_PROGRESS: 'IRRIGATION_IN_PROGRESS',
    MANUAL_CHECK_RECOMMENDED: 'MANUAL_CHECK_RECOMMENDED'
};

const DEFAULT_DURATION_MINUTES = 10;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 30;
const HOT_TEMPERATURE_THRESHOLD = 30;

const RECOMMENDATION_TEXT = {
    [ACTIONS.WATER_NOW]: "Démarrer l'irrigation maintenant.",
    [ACTIONS.DELAY_RAIN_EXPECTED]: "Reporter l'irrigation : pluie prévue prochainement.",
    [ACTIONS.NO_ACTION_NEEDED]: "Aucune irrigation nécessaire pour le moment.",
    [ACTIONS.IRRIGATION_IN_PROGRESS]: "Irrigation déjà en cours, aucune action requise.",
    [ACTIONS.MANUAL_CHECK_RECOMMENDED]: "Vérification manuelle recommandée avant d'irriguer."
};

function isRainExpected(weather) {
    if (!weather || !Array.isArray(weather.forecast)) {
        return false;
    }

    return weather.forecast.some((item) =>
        typeof item.description === 'string' &&
        /rain|pluie/i.test(item.description)
    );
}

function hasCriticalUnresolvedAlert(alerts) {
    if (!Array.isArray(alerts)) {
        return false;
    }

    return alerts.some((alert) =>
        !alert.resolved &&
        (alert.severity === 'critical' || alert.alertType === 'safety_stop')
    );
}

function computeMoistureDeficit(soilMoisture, threshold) {
    if (typeof soilMoisture !== 'number' || Number.isNaN(soilMoisture)) {
        return null;
    }

    return threshold - soilMoisture;
}

function computeDurationMinutes(baseDuration, deficit, threshold, temperature) {
    let duration = baseDuration || DEFAULT_DURATION_MINUTES;

    if (typeof deficit === 'number' && deficit > 0 && threshold > 0) {
        const severity = Math.min(deficit / threshold, 1);
        duration *= (1 + severity);
    }

    if (typeof temperature === 'number' && temperature >= HOT_TEMPERATURE_THRESHOLD) {
        duration *= 1.15;
    }

    return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(duration)));
}

function computeConfidence({ hasSensor, hasWeather, hasSettings, signalsAgree, warningsCount }) {
    let score = 55;

    if (hasSensor) score += 20;
    if (hasWeather) score += 10;
    if (hasSettings) score += 5;
    if (signalsAgree) score += 10;

    score -= warningsCount * 8;

    return Math.max(30, Math.min(98, Math.round(score)));
}

function buildWaterSavingAdvice({ action, rainSkipEnabled }) {
    if (action === ACTIONS.IRRIGATION_IN_PROGRESS) {
        return "Évitez de déclencher un second cycle avant la fin de celui en cours pour ne pas gaspiller d'eau.";
    }

    if (action === ACTIONS.DELAY_RAIN_EXPECTED) {
        return "De la pluie est prévue prochainement : reportez l'irrigation pour économiser de l'eau et laisser la pluie faire le travail.";
    }

    if (action === ACTIONS.NO_ACTION_NEEDED) {
        return "L'humidité du sol est suffisante : arroser maintenant gaspillerait de l'eau et pourrait noyer les racines.";
    }

    if (action === ACTIONS.MANUAL_CHECK_RECOMMENDED) {
        return "Vérifiez le matériel avant d'arroser : une alerte récente peut fausser les mesures et entraîner un gaspillage d'eau.";
    }

    const tips = ["Arrosez tôt le matin ou en soirée pour réduire l'évaporation."];

    if (!rainSkipEnabled) {
        tips.push("Activez l'option \"ignorer si pluie\" dans les paramètres pour économiser automatiquement de l'eau lors des prévisions de pluie.");
    }

    return tips.join(' ');
}

function decide({
    soilMoisture,
    temperature,
    threshold,
    baseDuration,
    rainSkipEnabled,
    pumpStatus,
    elapsedPumpMinutes,
    alerts,
    weather,
    warnings
}) {
    const deficit = computeMoistureDeficit(soilMoisture, threshold);
    const rainExpected = isRainExpected(weather);
    const criticalAlert = hasCriticalUnresolvedAlert(alerts);
    const explanationParts = [];

    let action;

    if (pumpStatus === 'ON') {
        action = ACTIONS.IRRIGATION_IN_PROGRESS;
        explanationParts.push("La pompe est actuellement active, un cycle d'irrigation est en cours.");
    } else if (criticalAlert) {
        action = ACTIONS.MANUAL_CHECK_RECOMMENDED;
        explanationParts.push('Une alerte récente non résolue nécessite une vérification avant toute irrigation.');
    } else if (deficit === null) {
        action = ACTIONS.MANUAL_CHECK_RECOMMENDED;
        explanationParts.push("Aucune donnée d'humidité du sol récente n'est disponible pour ce dispositif.");
    } else if (deficit <= 0) {
        action = ACTIONS.NO_ACTION_NEEDED;
        explanationParts.push(`L'humidité du sol (${soilMoisture}%) est au-dessus du seuil configuré (${threshold}%).`);
    } else if (rainExpected && rainSkipEnabled) {
        action = ACTIONS.DELAY_RAIN_EXPECTED;
        explanationParts.push(`L'humidité du sol (${soilMoisture}%) est sous le seuil (${threshold}%), mais de la pluie est prévue dans les prochaines heures.`);
    } else {
        action = ACTIONS.WATER_NOW;
        explanationParts.push(`L'humidité du sol (${soilMoisture}%) est sous le seuil configuré (${threshold}%).`);

        if (rainExpected && !rainSkipEnabled) {
            explanationParts.push("De la pluie est prévue mais l'option \"ignorer si pluie\" est désactivée.");
        }

        if (typeof temperature === 'number' && temperature >= HOT_TEMPERATURE_THRESHOLD) {
            explanationParts.push(`La température élevée (${temperature}°C) augmente les besoins en eau.`);
        }
    }

    let estimatedDurationMinutes = 0;

    if (action === ACTIONS.WATER_NOW || action === ACTIONS.DELAY_RAIN_EXPECTED) {
        estimatedDurationMinutes = computeDurationMinutes(baseDuration, deficit, threshold, temperature);
    } else if (action === ACTIONS.IRRIGATION_IN_PROGRESS) {
        const remaining = (baseDuration || DEFAULT_DURATION_MINUTES) - (elapsedPumpMinutes || 0);
        estimatedDurationMinutes = Math.max(0, Math.round(remaining));
    }

    const signalsAgree = deficit !== null && ((deficit > 0 && !rainExpected) || deficit <= 0);

    const confidence = computeConfidence({
        hasSensor: typeof soilMoisture === 'number',
        hasWeather: !!weather,
        hasSettings: !!baseDuration,
        signalsAgree,
        warningsCount: Array.isArray(warnings) ? warnings.length : 0
    });

    const waterSavingAdvice = buildWaterSavingAdvice({ action, rainSkipEnabled });

    return {
        action,
        recommendationText: RECOMMENDATION_TEXT[action],
        explanation: explanationParts.join(' '),
        confidence,
        estimatedDurationMinutes,
        waterSavingAdvice,
        rainExpected,
        deficit
    };
}

module.exports = {
    ACTIONS,
    decide
};
