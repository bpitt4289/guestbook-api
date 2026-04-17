const express = require("express");
const cors = require("cors");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "guestbook.db");

app.use(cors());
app.use(express.json());

let db;

async function start() {
  const SQL = await initSqlJs();

  // Load existing database file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  save();

  // GET /messages — return all guestbook messages
  app.get("/messages", (req, res) => {
    const results = db.exec("SELECT name, message, timestamp FROM messages ORDER BY id DESC");
    const messages = results.length
      ? results[0].values.map(([name, message, timestamp]) => ({ name, message, timestamp }))
      : [];
    res.json(messages);
  });

  // POST /messages — save a new guestbook message
  app.post("/messages", (req, res) => {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: "name and message are required" });
    }

    db.run("INSERT INTO messages (name, message) VALUES (?, ?)", [name, message]);
    save();

    res.status(201).json({ success: true });
  });

  app.listen(PORT, () => {
    console.log(`Guestbook API running on http://localhost:${PORT}`);
  });
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

start();
