require('dotenv').config({ quiet: true });
const { Pool, types } = require('pg');

// DATE columns (OID 1082) default to being parsed into JS Date objects at
// local-server-midnight, which shifts the calendar day once serialized back
// to UTC via toISOString(). Keep them as plain 'YYYY-MM-DD' strings instead.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});


module.exports = pool;
