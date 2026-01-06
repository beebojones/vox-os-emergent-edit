import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,

    // ⭐ Disable SSL for Railway Postgres
    ssl: false
});

export default {
    query: (text, params) => pool.query(text, params),
    pool
};