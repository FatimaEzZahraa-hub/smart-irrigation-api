require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
});