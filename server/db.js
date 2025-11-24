const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/macguffin.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Promisify database methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database if needed
async function initializeDatabase() {
  const initSQL = fs.readFileSync(path.join(__dirname, 'init_db.sql'), 'utf8');
  const statements = initSQL.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      await dbRun(statement);
    }
  }
  console.log('Database initialized');
}

// Check if database is initialized
dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
  .then(tableCheck => {
    if (!tableCheck) {
      return initializeDatabase();
    }
  })
  .catch(err => console.error('Database initialization error:', err));

module.exports = { db, dbRun, dbGet, dbAll };

