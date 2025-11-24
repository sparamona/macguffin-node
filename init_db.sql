-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Macguffins table
CREATE TABLE IF NOT EXISTS macguffins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- User inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  macguffin_id INTEGER NOT NULL,
  macguffin_name TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (macguffin_id) REFERENCES macguffins(id)
);

-- Insert test macguffins
INSERT OR IGNORE INTO macguffins (id, name) VALUES (1, 'Golden Idol');
INSERT OR IGNORE INTO macguffins (id, name) VALUES (2, 'Holy Grail');
INSERT OR IGNORE INTO macguffins (id, name) VALUES (3, 'Maltese Falcon');

