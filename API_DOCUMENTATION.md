# Smart Irrigation API

## Authentication

### Register

POST /api/auth/register

### Login

POST /api/auth/login

### Profile

GET /api/auth/profile

Requires JWT Token

---

## Devices

### Create Device

POST /api/devices

### Get Devices

GET /api/devices

### Get Device By ID

GET /api/devices/:id

Requires JWT Token

---

## Sensors

### Save Sensor Data

POST /api/sensors/data

### Latest Data

GET /api/sensors/latest/:deviceId

### History

GET /api/sensors/history/:deviceId

---

## Pump

### Turn ON

POST /api/pump/on

### Turn OFF

POST /api/pump/off

### History

GET /api/pump/history/:deviceId

---

## Alerts

### Get Alerts

GET /api/alerts

### Create Alert

POST /api/alerts

### Resolve Alert

PATCH /api/alerts/:id/resolve

### Structure
src/
│

├── config/

│   └── db.js

│

├── middleware/

│   └── auth.js

│

├── routes/

│   ├── auth.js

│   ├── devices.js

│   ├── sensors.js

│   ├── pump.js

│   └── alerts.js

│

├── app.js

│
server.js
