const aiDataAggregator = require('./aiDataAggregator');
const recommendationRules = require('./recommendationRules');
const aiExplanationService = require('./aiExplanationService');

class AiRecommendationEngine {

    async generateRecommendation(deviceId, userId) {
        const context = await aiDataAggregator.collectContext(deviceId, userId);

        const decision = recommendationRules.decide({
            soilMoisture: context.sensor ? context.sensor.soilMoisture : null,
            temperature: context.sensor ? context.sensor.temperature : null,
            threshold: context.settings.humidityThreshold,
            baseDuration: context.settings.irrigationDurationMinutes,
            rainSkipEnabled: context.settings.isRainSkipEnabled,
            pumpStatus: context.pump.status,
            elapsedPumpMinutes: context.pump.elapsedMinutes,
            alerts: context.alerts,
            weather: context.weather,
            warnings: context.warnings
        });

        const explanation = await aiExplanationService.explain({
            action: decision.action,
            recommendation: decision.recommendationText,
            explanation: decision.explanation,
            confidence: decision.confidence,
            estimatedIrrigationDurationMinutes: decision.estimatedDurationMinutes,
            waterSavingAdvice: decision.waterSavingAdvice
        });

        return this.formatResponse(context, decision, explanation);
    }

    formatResponse(context, decision, explanation) {
        return {
            deviceId: context.deviceId,
            generatedAt: new Date().toISOString(),

            action: decision.action,

            recommendation: decision.recommendationText,
            recommandation: decision.recommendationText,

            explanation,
            explication: explanation,

            confidence: decision.confidence,
            confiance: decision.confidence,

            estimatedIrrigationDurationMinutes: decision.estimatedDurationMinutes,
            dureeIrrigationEstimeeMinutes: decision.estimatedDurationMinutes,

            waterSavingAdvice: decision.waterSavingAdvice,
            conseilEconomieEau: decision.waterSavingAdvice,

            basis: {
                soilMoisture: context.sensor ? context.sensor.soilMoisture : null,
                humidityThreshold: context.settings.humidityThreshold,
                temperature: context.sensor ? context.sensor.temperature : null,
                pumpStatus: context.pump.status,
                rainExpected: decision.rainExpected,
                recentAlertsCount: context.alerts.length,
                dataWarnings: context.warnings
            }
        };
    }

}

module.exports = new AiRecommendationEngine();
