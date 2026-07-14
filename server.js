require('dotenv').config({ quiet: true });

const app = require('./src/app');
const connectMongo = require('./src/config/mongo');
const Database = require('./src/models/postgres/Database');
const autoIrrigationService = require('./src/services/autoIrrigationService');
const irrigationSafetyJob = require('./src/jobs/irrigationSafetyJob');

const PORT = process.env.PORT || 3000;

async function startServer() {
    await Database.init();
    await connectMongo();

    autoIrrigationService.startListening();
    irrigationSafetyJob.start();

    if (process.env.DEMO_MODE === 'true') {
        console.log('⚠️  DEMO_MODE=true — fake sensor, weather and device data active');
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
});
