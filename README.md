# Macguffin Tracker

A simple web application for tracking collectible items (macguffins) with user authentication and role-based access.

## Tech Stack

- **Frontend**: React 19.2.0 + Vite 7.2.4
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt

## Quick Start

### Development

1. Install server dependencies:
```bash
cd server
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
```

3. Start the server (from root):
```bash
cd server
npm run dev
```

4. Start the client (from root):
```bash
cd client
npm run dev
```

The client will run on http://localhost:5173 (or 5174) and proxy API calls to the server on port 3000.

### Production (Docker)

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Access the app at http://localhost:3000

## Environment Variables

- `JWT_SECRET` - Secret key for JWT tokens
- `BELL_API_KEY` - API key for external bell service
- `ADMIN_EMAIL` - Email to mark as admin on first run
- `DB_PATH` - Path to SQLite database file (default: ./data/macguffin.db)
- `PORT` - Server port (default: 3000)

## Test Accounts

- Admin: `admin@test.com` / `password123`
- User: `user@test.com` / `password123`

## Features

- Public leaderboard
- User authentication
- Personal inventory tracking
- Admin CRUD for macguffins

