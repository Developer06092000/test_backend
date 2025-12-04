const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "test",
});

db.connect((err) => {
  if (err) {
    console.log("MySQL ulanmadi:", err);
    return;
  }
  console.log("MySQL ulandi ✔");
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
