const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '🌱 Smart Irrigation API is running' });
});

const sensorRoutes = require('./routes/sensors');
const pumpRoutes = require('./routes/pump');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const weatherRoutes = require('./routes/weather');
const aiRoutes = require('./routes/ai');

app.use('/api/sensors', sensorRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;
