const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true
    },

    soilMoisture: {
      type: Number,
      required: true
    },

    temperature: {
      type: Number,
      required: true
    },

    airHumidity: {
      type: Number,
      required: true
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    collection: 'sensor_readings'
  }
);

sensorReadingSchema.index({ deviceId: 1, createdAt: -1 });

sensorReadingSchema.statics.createReading = function (reading) {
  return this.create(reading);
};

sensorReadingSchema.statics.findLatestByDeviceId = function (deviceId) {
  return this.findOne({ deviceId }).sort({ createdAt: -1 });
};

sensorReadingSchema.statics.findHistoryByDeviceId = function (deviceId, filters = {}) {
  const query = { deviceId };

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};

    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(100);
};

module.exports = mongoose.model(
  'SensorReading',
  sensorReadingSchema
);
