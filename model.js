// const mysql = require("mysql2");

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "test",
// });

// db.connect((err) => {
//   if (err) {
//     console.log("MySQL ulanmadi:", err);
//     return;
//   }
//   console.log("MySQL ulandi ✔");
// });

const pg = require("pg");

const { Pool } = pg;

const db = new Pool({
  connectionString:
    // "postgres://postgres.wuyubslcfjbtmsylrzml:Z3SUeIc1Dpv87IS3@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
    "postgres://postgres.wuyubslcfjbtmsylrzml:Z3SUeIc1Dpv87IS3@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
  ssl: { require: true, rejectUnauthorized: false },
});

async function initTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title VARCHAR(1000) NOT NULL
      );
    `);
    console.log("questions created");

    await db.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question_id BIGINT NOT NULL,
        answer_text VARCHAR(500) NOT NULL,
        correct BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      );
    `);
    console.log("answers created");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

initTables();

module.exports = db;
