# Macguffin Tracker — SPECIFICATION (Option B: Node.js + SQLite, One-Click Linode)

**
**Version**: 1.1
**Last Updated**: 2025-11-24

---

## 1. Project Overview

Port the original Macguffin Tracker from the previous backend to a minimal self-hosted stack suitable for a "one-click" Linode deployment. The app remains a small React front-end plus a single Node.js server that provides authentication, a REST API, and background function behavior.

Core principles preserved:

* Simplicity first
* Minimal files
* Minimal error handling
* Small surface area for operations and maintenance

New constraints added:

* Single server process (Node.js + Express)
* Data persisted in SQLite (file-based) for easy one-node deployment
* Authentication using email/password with bcrypt + JWT
* `ringTheBell` behavior executed server-side (so secrets don't live in the client)
* Deployable via Docker for one-click Linode install

## 2. Technology Stack (new)

### Frontend

* React 19.2.0 (unchanged)
* Vite 7.2.4
* Plain CSS
* JavaScript (no TypeScript)

### Backend

* Node.jsthe previous backend(Express)
* Database: SQLite (via `better-sqlite3` or `knex` + `sqlite3`)
* Auth: Email/password stored hashed with `bcrypt`; authentication via JSON Web Tokens (JWT)
* Background/Function: server endpoint handles `ringTheBell` call after inventory insert (no separate serverless function)

### Deployment

* Dockerfile + docker-compose for one-click Linode deploy
* Optionally a single Docker image that Linode marketplace or a Linode StackScript can launch

## 3. User Roles & Permissions (new implementation)

### Public (No Login)

* View leaderboard (same)

### Authenticated User

* View leaderboard
* View personal dashboard
* View personal inventory
* Add macguffins to inventory ("Found One!")

### Admin User

* All user permissions
* Create macguffins
* Edit macguffins
* Delete macguffins

**Admin Implementation**: `users.is_admin BOOLEAN` in the users table. Admin-only API routes verify `is_admin` claim inside the JWT (or by reloading user from DB).

## 4. Database Schema (SQLite)

### Table: `users`

```sql
id TEXT PRIMARY KEY,      -- UUID (e.g. generated with uuidv4)
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
is_admin BOOLEAN DEFAULT 0,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Table: `macguffins`

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL
```

### Table: `user_inventory`

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id TEXT NOT NULL,               -- references users.id
user_email TEXT NOT NULL,
macguffin_id INTEGER NOT NULL,       -- references macguffins.id
macguffin_name TEXT NOT NULL,        -- denormalized
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
```

Add foreign key constraints if desired; SQLite supports `PRAGMA foreign_keys = ON`.

## 5. Security & Authorization (  rules)

All authorization is enforced server-side.

* **Public endpoints**:

  * `GET /api/leaderboard` — returns aggregated counts
  * `GET /api/macguffins` — list of macguffins

* **Auth endpoints**:

  * `POST /auth/register` — (optional; spec previously created users in console. You can omit registration to preserve original simplification.)
  * `POST /auth/login` — returns JWT

* **Protected endpoints (require Authorization: Bearer <token>)**:

  * `GET /api/me/inventory` — returns inventory for authenticated user
  * `POST /api/me/inventory` — create inventory for authenticated user (server will call ringTheBell)
  * `GET /api/me` — return user profile

* **Admin endpoints (require JWT + is_admin)**:

  * `POST /api/macguffins` — create
  * `PUT /api/macguffins/:id` — update
  * `DELETE /api/macguffins/:id` — delete

Server middleware verifies JWT and attaches `req.user` (id, email, is_admin). Users may only create inventory where `user_id` == `req.user.id` (server will enforce this — client cannot set arbitrary `user_id`).

**Note about `ringTheBell`**: external service credentials (e.g. `BELL_API_KEY`) live in server environment variables and are never exposed to the client. When the server receives `POST /api/me/inventory`, it will insert the row, then asynchronously call the external API.

## 6. API Endpoints

### Public

* `GET /api/leaderboard`

  * Response: `[{ user_id, user_email, count }]` sorted by count desc
* `GET /api/macguffins`

  * Response: `[{ id, name }]

### Auth

* `POST /auth/login` `{ email, password }` → `{ token }`
* `POST /auth/register` (optional) `{ email, password }` → `{ token }`

### User (authenticated)

* `GET /api/me` → `{ id, email, is_admin }`
* `GET /api/me/inventory` → list of user's inventory rows
* `POST /api/me/inventory` `{ macguffin_id }` → server inserts row; server will look up macguffin name for denormalized copy; server calls ringTheBell; returns inserted row

### Admin (authenticated + is_admin)

* `POST /api/macguffins` `{ name }`
* `PUT /api/macguffins/:id` `{ name }`
* `DELETE /api/macguffins/:id`

## 7. `ringTheBell` Server Behavior

When an authenticated user creates an inventory row (`POST /api/me/inventory`):

1. Server validates `macguffin_id` exists
2. Server inserts into `user_inventory` (user_email and macguffin_name denormalized)
3. Server asynchronously calls the external bell API using an internal secret (ENV var `BELL_API_KEY`) and includes `macguffinName`, `userId`, and `timestamp`.
4. The response of the external API is logged; failures do **not** break the client response. The server returns `{ success: true, record }` to the client as soon as DB insert succeeds.

Reason: keeps secrets server-side, ensures client receives fast response.

## 8. Application Pages / Views (unchanged UI)

Frontend routes and UI remain the same. The only changes are that calls use the new REST API and auth with JWT rather than the previous backend SDK.

**Client responsibilities**:

* Store JWT in memory or secure cookie (recommendation below)
* Include `Authorization: Bearer <token>` header on protected requests
* On login: save token and user info in App state
* On logout: clear token and state

## 9. Component Changes (implementation notes)

* `App.jsx` now handles token + user state rather than the previous backend `onAuthStateChanged`.
* `Login.jsx` calls `POST /auth/login` and receives `{ token }` and user info.
* `UserDashboard.jsx` uses fetch with Authorization header to load inventory and to post new inventory.
* `AdminCRUD.jsx` calls admin endpoints using the admin token.

## 10. Backend Implementation Outline

**server/index.js** (Express)

* Middleware:

  * `express.json()`
  * `authMiddleware` — extracts Bearer token, verifies JWT, attaches `req.user`
* Routes:

  * `POST /auth/login`
  * (optional) `POST /auth/register`
  * `GET /api/macguffins`
  * `GET /api/leaderboard`
  * `GET /api/me` (auth)
  * `GET /api/me/inventory` (auth)
  * `POST /api/me/inventory` (auth)
  * `POST/PUT/DELETE /api/macguffins` (admin)
* DB helper module: `db.js` (wraps better-sqlite3)
* JWT helper: `auth.js` (create/verify tokens)

**server/utils/ringTheBell.js**

* `async function ringTheBell({ macguffinName, userId, timestamp })` — does fetch to external API using `process.env.BELL_API_KEY`

## 11. Project File Structure (updated)

```
macguffin/
├── server/
│   ├── index.js
│   ├── db.js
│   ├── auth.js
│   ├── utils/
│   │   └── ringTheBell.js
│   └── package.json
├── src/ (React app)
│   ├── components/
│   └── ...
├── Dockerfile
├── docker-compose.yml (optional)
├── README.md
├── init_db.sql
└── SPECIFICATION-SQLITE.md  (this document)
```

## 12. Docker & One-Click Deployment (Linode)

### Dockerfile (example)

* Build frontend (Vite) into `/app/dist`
* Use `node:20-alpine` to serve Express which serves the static `dist/` and provides API
* Expose port `3000`

### docker-compose.yml

* Service `app` builds image
* Volume for `data` mount where the SQLite file (`/data/macguffin.db`) is stored so data survives container restarts

### Environment variables (set in one-click app or stack script)

* `JWT_SECRET` — strong random secret
* `BELL_API_KEY` — token used by ringTheBell external call
* `ADMIN_EMAIL` — optional email to mark as admin on first run

### One-click flow

1. Build image and run container with mounted `/data` volume.
2. On startup, server checks for DB file; if missing, executes `init_db.sql` to bootstrap tables and (optionally) create test accounts (admin/test users per original spec).
3. App is reachable at `http://<linode-ip>:3000` (or via a configured domain + reverse proxy)

## 13. Scripts & package.json (server)

```json
"scripts": {
  "start": "node server/index.js",
  "dev": "NODE_ENV=development nodemon server/index.js",
  "migrate": "node server/migrate.js"
}
```

`migrate.js` will execute `init_db.sql` or run minimal migrations.

## 14. Testing Workflow (updated)

**Test Accounts** (mimic previous spec):

* `admin@test.com` / `password123` (set `is_admin = 1` in users on first run or by `ADMIN_EMAIL` env)
* `user@test.com` / `password123` (created on first-run or by registration endpoint if enabled)

**Test Scenarios** follow the same flows as the original spec (leaderboard public, user inventory add, admin CRUD), but through REST API.

## 15. Known Limitations & Design Decisions (updated)

* Single-node SQLite is not horizontally scalable; acceptable for light/one-server usage.
* No password reset/email verification unless you add SMTP support.
* Security: store secrets in environment variables or secret store; ensure HTTPS via reverse proxy (nginx or Linode Load Balancer).
* No real-time onSnapshot; client will poll or refresh UI after operations.
* Denormalized fields remain (`macguffin_name`, `user_email`) for fast reads.

## 16. Migration Steps (from the previous backend)

1. Export `macguffins` and `user_inventory` from Firestore (JSON).
2. Transform data into SQL `INSERT` statements (script provided or an import script).
3. For users: since the previous backend handled passwords, you cannot extract raw passwords. You will either:

   * Re-create users and email them to reset passwords, or
   * Use the app's registration flow and invite users to sign up.

## 17. Operational Notes

* Back up `macguffin.db` regularly (snapshot / cron job).
* Monitor disk usage and logs. For small usage, SQLite is simple and low maintenance.
* If growth occurs, plan migration to Postgres (simple schema-preserving migration).

## 18. Next Steps I can do for you (pick one or more)

* Generate the full server scaffold (`server/*`) including `index.js`, `db.js`, `auth.js`, `ringTheBell.js`, and `init_db.sql`.
* Create a Dockerfile and `docker-compose.yml` for one-click deployment on Linode.
* Produce a migration script to import data from your current `/mnt/data/SPECIFICATION.md` or Firestore JSON export.
* Update React client code with fetch calls and JWT flow.

