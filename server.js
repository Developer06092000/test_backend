const express = require("express");

const app = express();

const cors = require("cors");

const db = require("./model");

const fs = require("fs/promises");

const fileUpload = require("express-fileupload"); // fayl upload uchun

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.use(
  cors({
    origin: "*", // or '*' for all origins
    // origin: "http://localhost:5173", // or '*' for all origins
  })
);

async function parseQuestionsFile(filePath) {
  // async function parseQuestionsFile(filePath) {
  // 1. Faylni o‘qish
  // const raw = await fs.readFile(filePath, "utf8");
  const raw = await filePath;

  // 2. ++++ bo‘yicha bloklarga ajratish
  const blocks = raw
    .split("++++")
    .map((b) => b.trim())
    .filter(Boolean);

  // 3. Har bir blokni parse qilish
  const result = blocks.map((block) => {
    const parts = block
      .split("====")
      .map((p) => p.trim())
      .filter(Boolean);

    const question = parts[0];

    // Javoblar
    const answers = parts.slice(1).map((ans) => {
      let correct = false;

      if (ans.startsWith("#")) {
        correct = true;
        ans = ans.substring(1).trim();
      }

      return {
        text: ans,
        correct,
      };
    });

    return {
      question,
      answers,
    };
  });

  return result;
}

// --- Ishlatish ---
// (async () => {
//   const questions = await parseQuestionsFile("data.txt");
//   console.log(JSON.stringify(questions, null, 2));
// })();

// function parseQuestionBlock(text) {
//   // Keraksiz bo'shliqlarni tozalaymiz
//   text = text.trim();

//   // 1. Bo'laklarga ajratish (++++ va ==== bo'yicha)
//   const parts = text.split("====").map((p) => p.trim());

//   // Expected:
//   // parts[0] => ++++ savol
//   // parts[1] => javob 1
//   // parts[2] => javob 2
//   // parts[3] => javob 3
//   // parts[4] => javob 4 + ++++

//   // Savolni ajratamiz (++++ dan keyingi matn)
//   let question = parts[0].replace(/\+{4}/g, "").trim();

//   // Javoblar massivini tayyorlaymiz
//   const answers = parts.slice(1).map((ans) => {
//     // texdagi ++++ bo'lsa olib tashlaymiz
//     ans = ans.replace(/\+{4}/g, "").trim();

//     // to'g'ri javob belgisi (#)
//     const isCorrect = ans.startsWith("#");

//     // # ni olib tashlash
//     ans = ans.replace(/^#/, "").trim();

//     return {
//       text: ans,
//       correct: isCorrect,
//     };
//   });

//   return {
//     title: question,
//     answers,
//   };
// }

// const fs = require("fs");

// fs.readFile("data.txt", "utf8", (err, data) => {
//   if (err) {
//     console.error("Faylni o‘qishda xatolik:", err);
//     return;
//   }
//   console.log(parseQuestionBlock(data));
// });

app.get("/questions", (req, res) => {
  db.query("SELECT * FROM questions", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post("/questions", (req, res) => {
  const { title, answers } = req.body;

  db.query("INSERT INTO questions (title) VALUES (?)", [title], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    const questionId = result.insertId;

    const values = answers.map((ans) => [questionId, ans]);

    db.query("INSERT INTO answers (question_id, answer_text) VALUES ?", [values], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });

      res.json({
        message: "Savol va javoblar qo‘shildi",
        questionId,
      });
    });
  });
});

app.post("/upload-questions", async (req, res) => {
  if (!req.files || !req.files.txtfile) {
    return res.status(400).json({ error: "Fayl yuklanmadi" });
  }

  const txtFile = req.files.txtfile;
  // const filePath = `./temp_${Date.now()}.txt`;
  const textContent = txtFile.data.toString("utf8");

  // Faylni vaqtincha saqlash
  // await txtFile.mv(filePath);
  await textContent;

  try {
    // const questions = await parseQuestionsFile(filePath);
    const questions = await parseQuestionsFile(textContent);

    // Har bir savol va javobni DBga qo‘shish
    for (let q of questions) {
      const result = await new Promise((resolve, reject) => {
        db.query("INSERT INTO questions (title) VALUES (?)", [q.question], (err, resQ) => {
          if (err) reject(err);
          else resolve(resQ);
        });
      });

      const questionId = result.insertId;

      // Javoblar massivini tayyorlash
      const values = q.answers.map((a) => [questionId, a.text, a.correct ? 1 : 0]);

      await new Promise((resolve, reject) => {
        db.query("INSERT INTO answers (question_id, answer_text, correct) VALUES ?", [values], (err2) => {
          if (err2) reject(err2);
          else resolve();
        });
      });
    }

    res.json({ message: "Savollar va javoblar muvaffaqiyatli qo‘shildi", count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/questions", (req, res) => {
  const sql = `
    SELECT q.id AS question_id, q.title, a.id AS answer_id, a.answer_text
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    // Formatlash (group by question)
    const data = {};

    results.forEach((row) => {
      if (!data[row.question_id]) {
        data[row.question_id] = {
          id: row.question_id,
          title: row.title,
          answers: [],
        };
      }

      if (row.answer_id) {
        data[row.question_id].answers.push({
          id: row.answer_id,
          text: row.answer_text,
        });
      }
    });

    res.json(Object.values(data));
  });
});

app.put("/questions/:id", (req, res) => {
  const { id } = req.params;
  const { title, answers } = req.body;

  // 1) title-ni yangilash
  db.query("UPDATE questions SET title = ? WHERE id = ?", [title, id], (err) => {
    if (err) return res.status(500).json({ error: err });

    // 2) eski answerslarni o‘chirish
    db.query("DELETE FROM answers WHERE question_id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });

      // 3) yangi answerslarni qo‘shish
      const values = answers.map((a) => [id, a]);

      db.query("INSERT INTO answers (question_id, answer_text) VALUES ?", [values], (err3) => {
        if (err3) return res.status(500).json({ error: err3 });

        res.json({
          message: "Savol va javoblar yangilandi",
        });
      });
    });
  });
});

app.delete("/questions/:id", (req, res) => {
  const { id } = req.params;

  // Avval javoblarni o‘chiramiz
  db.query("DELETE FROM answers WHERE question_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err });

    // So‘ng savolni o‘chiramiz
    db.query("DELETE FROM questions WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });

      res.json({ message: "Savol va javoblar o‘chirildi" });
    });
  });
});

app.post("/get-random-questions", (req, res) => {
  // 1) Random 25 ta savol olish
  const sqlQuestions = `
    SELECT * FROM questions
    ORDER BY RAND()
    LIMIT 25
  `;

  db.query(sqlQuestions, (err, questions) => {
    if (err) return res.status(500).json({ error: err });

    if (questions.length === 0) return res.json({ questions: [] });

    // 2) Savol id-larini olish
    const questionIds = questions.map((q) => q.id);

    // 3) Javoblarni olish
    const sqlAnswers = `
      SELECT * FROM answers
      WHERE question_id IN (?)
      ORDER BY RAND()
    `;

    db.query(sqlAnswers, [questionIds], (err2, answers) => {
      if (err2) return res.status(500).json({ error: err2 });

      // 4) Har bir savolga javoblarni biriktirish
      const result = questions.map((q) => {
        const qAnswers = answers.filter((a) => a.question_id === q.id).map((a) => a.answer_text);

        return {
          id: q.id,
          question: q.title,
          answers: qAnswers,
        };
      });

      res.json(result);
    });
  });
});

app.post("/check-answers", (req, res) => {
  const userAnswers = req.body.data; // [{ id: 30, answer: "..."}]

  // console.log(typeof userAnswers, !Array.isArray(JSON.parse(userAnswers)));

  if (!Array.isArray(userAnswers)) return res.status(400).json({ error: "Invalid format" });

  const ids = userAnswers.map((a) => a.id);

  const query = `
    SELECT q.id, a.answer_text AS correct_answer
    FROM questions q
    JOIN answers a ON q.id = a.question_id
    WHERE a.correct = 1 AND q.id IN (?)
  `;

  db.query(query, [ids], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    // to'g'ri javoblar obyekt shaklida
    const correctMap = {};
    results.forEach((r) => {
      correctMap[r.id] = r.correct_answer;
    });

    // javoblarni tekshiramiz
    let true_answer = 0;

    const checked = userAnswers.map((ua) => {
      const correctAnswer = correctMap[ua.id];

      const isCorrect = ua.answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

      if (isCorrect) true_answer++;

      return {
        id: ua.id,
        answer: ua.answer,
        correct: isCorrect,
        ...(isCorrect ? {} : { correctAnswer }),
      };
    });

    res.json({ data: checked, true_answer });
  });
});

// app.post("/users", (req, res) => {
//   const { name, email } = req.body;
//   db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email], (err, results) => {
//     if (err) throw err;
//     res.json({ message: "User qo'shildi", id: results.insertId });
//   });
// });

// app.delete("/users/:id", (req, res) => {
//   const { id } = req.params;
//   db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
//     if (err) throw err;
//     res.json({ message: "User o'chirildi" });
//   });
// });

const PORT = 5000;
app.listen(PORT, () => console.log(`Server ${PORT} da ishlayapti 🚀`));
