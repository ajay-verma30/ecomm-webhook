
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }, 
  max: 5
});


pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

module.exports = pool;
