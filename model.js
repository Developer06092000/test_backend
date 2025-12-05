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

db.query(
  `CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(1000)
  )`,
  (err) => {
    if (err) return console.error(err);

    console.log("create table questions");
  }
);

db.query(
  ` CREATE TABLE IF NOT EXISTS answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT,
    answer_text VARCHAR(500),
    correct TINYINT(1) DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  )`,
  (err) => {
    if (err) return console.error(err);

    console.log("create table answers");
  }
);

module.exports = db;
