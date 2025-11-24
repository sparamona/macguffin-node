const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('./db');
const { createToken, authMiddleware, adminMiddleware } = require('./auth');
const { ringTheBell } = require('./ringTheBell');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Macguffin Tracker API is running' });
});

// Public: Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await dbAll(`
      SELECT
        user_id,
        user_email,
        COUNT(*) as count
      FROM user_inventory
      GROUP BY user_id, user_email
      ORDER BY count DESC
    `);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Public: Get all macguffins
app.get('/api/macguffins', async (req, res) => {
  try {
    const macguffins = await dbAll('SELECT id, name FROM macguffins ORDER BY name');
    res.json(macguffins);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch macguffins' });
  }
});

// Auth: Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Auth: Register (optional)
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await dbRun(
      'INSERT INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [id, email, password_hash, 0]
    );

    const user = { id, email, is_admin: 0 };
    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User: Get my inventory
app.get('/api/user/inventory', authMiddleware, async (req, res) => {
  try {
    const inventory = await dbAll(
      'SELECT id, macguffin_id, macguffin_name, timestamp FROM user_inventory WHERE user_id = ? ORDER BY timestamp DESC',
      [req.user.id]
    );
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// User: Add macguffin to my inventory
app.post('/api/user/inventory', authMiddleware, async (req, res) => {
  try {
    const { macguffin_id } = req.body;

    if (!macguffin_id) {
      return res.status(400).json({ error: 'macguffin_id required' });
    }

    const macguffin = await dbGet('SELECT id, name FROM macguffins WHERE id = ?', [macguffin_id]);

    if (!macguffin) {
      return res.status(404).json({ error: 'Macguffin not found' });
    }

    const timestamp = new Date().toISOString();

    await dbRun(
      'INSERT INTO user_inventory (user_id, user_email, macguffin_id, macguffin_name, timestamp) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.email, macguffin.id, macguffin.name, timestamp]
    );

    // Ring the bell asynchronously (don't wait for it)
    ringTheBell({
      macguffinName: macguffin.name,
      userId: req.user.id,
      timestamp
    }).catch(err => console.error('Bell ring failed:', err));

    res.json({ success: true, macguffin: macguffin.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add macguffin' });
  }
});

// Admin: Create macguffin
app.post('/api/macguffins', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }

    const result = await dbRun('INSERT INTO macguffins (name) VALUES (?)', [name]);

    res.json({ id: result.lastID, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create macguffin' });
  }
});

// Admin: Update macguffin
app.put('/api/macguffins/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }

    await dbRun('UPDATE macguffins SET name = ? WHERE id = ?', [name, id]);

    res.json({ id: parseInt(id), name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update macguffin' });
  }
});

// Admin: Delete macguffin
app.delete('/api/macguffins/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await dbRun('DELETE FROM macguffins WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete macguffin' });
  }
});

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

