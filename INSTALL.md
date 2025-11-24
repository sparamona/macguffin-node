# Macguffin Tracker - Linode Docker Deployment Guide

## One-Click Deployment with Docker on Linode

This guide will walk you through deploying Macguffin Tracker on Linode using Docker for maximum simplicity and security.

---

## 🚀 Quick Reference

**After initial setup, these are the most common commands:**

```bash
# SSH into your server
ssh deploy@YOUR_LINODE_IP

# Navigate to app directory
cd /opt/macguffin

# Update and restart (after git pull)
git pull origin main
docker compose build
docker compose up -d

# View logs
docker compose logs -f app

# Manage users
docker compose exec app npm run manage-users

# Backup database
cp data/macguffin.db data/macguffin.db.backup-$(date +%Y%m%d)
```

**See Step 4.10 for complete operations guide.**

---

### Prerequisites

- A Linode account ([sign up here](https://www.linode.com))
- A domain name (optional, but recommended for SSL)
- Your SSH public key (generate with `ssh-keygen` if you don't have one)

### What You'll Create

- A Linode server with Docker pre-installed
- A non-root sudo user for secure SSH access
- Macguffin Tracker running in Docker containers
- Optional: Nginx reverse proxy with automatic SSL certificates
- Firewall protection with UFW
- Brute-force protection with fail2ban

---

## Step 1: Create a Linode with Docker

### 1.1: Log in to Linode Cloud Manager

Go to [https://cloud.linode.com](https://cloud.linode.com) and log in.

### 1.2: Create a New Linode

1. Click the **Create** button (top right)
2. Select **Linode** from the dropdown

### 1.3: Choose the Docker Marketplace Image

1. Click the **Marketplace** tab
2. In the search box, type **"Docker"**
3. Click on **Docker** (official Linode Marketplace app)
4. Click **Select**

### 1.4: Configure Docker Setup Options

The Docker Marketplace app has specific setup fields. Here's what to enter:

#### Required Field:

**The limited sudo user to be created for the Linode:**
- Enter a username (lowercase, no special characters)
- **Recommended:** `deploy`
- This user will:
  - Have sudo access (can run commands as root)
  - Be used for SSH login
  - Be more secure than using root directly

#### Advanced Options (Click to Expand):

**1. Disable root access over SSH?**
- **Recommended:** Select **Yes**
- **Why:** Prevents direct root login, forcing use of the sudo user
- **Security benefit:** Attackers can't brute-force the root account
- **Note:** You can still become root with `sudo -i` after logging in

**2. Your Linode API token** (optional)
- **Recommended:** Leave blank
- **What it does:** Allows automatic DNS record creation in Linode DNS
- **Why skip it:** We'll configure DNS manually for more control
- **When to use:** Only if you manage DNS through Linode and want automation

**3. Subdomain** (optional)
- **Recommended:** Leave blank
- **What it does:** Creates a subdomain DNS record (e.g., `macguffin.yourdomain.com`)
- **Requires:** Linode API token and domain fields to be filled
- **Why skip it:** We'll configure DNS manually in Step 2

**4. Domain** (optional)
- **Recommended:** Leave blank
- **What it does:** Creates DNS records in Linode DNS
- **Requires:** Linode API token
- **Why skip it:** We'll configure DNS manually for flexibility

**5. Email address for new DNS zone** (optional)
- **Recommended:** Leave blank
- **What it does:** Sets the SOA email for DNS zone
- **Requires:** Domain and API token fields
- **Why skip it:** Not needed if configuring DNS manually

#### Summary of Recommended Settings:

```
✓ Limited sudo user: deploy
✓ Disable root SSH: Yes
✗ API token: (leave blank)
✗ Subdomain: (leave blank)
✗ Domain: (leave blank)
✗ Email: (leave blank)
```

**Why these settings?**
- Creates a secure, non-root user for SSH
- Disables root login for better security
- Skips automatic DNS (we'll do it manually for more control)

### 1.5: Configure Linode Settings

**Region:**
- Choose a region close to your users (e.g., Newark, NJ for US East Coast)

**Linode Plan:**
- **Shared CPU** → **Nanode 1 GB** ($5/month) is sufficient for most use cases
- For higher traffic, choose **Linode 2 GB** ($12/month)

**Linode Label:**
- Enter a name: `macguffin-tracker`

**Add Tags (optional):**
- Add tags like `production`, `docker`, `macguffin`

**Root Password:**
- Create a strong root password
- You'll only need this for emergency console access if root SSH is disabled

**SSH Keys (HIGHLY RECOMMENDED):**
1. Click **Add An SSH Key**
2. Paste your SSH public key (from `~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`)
3. Give it a label like "My Laptop"
4. Click **Add Key**

### 1.6: Create the Linode

1. Review your selections
2. Click **Create Linode** (bottom right)
3. Wait 2-3 minutes for the Linode to boot and Docker to install

### 1.7: Note Your IP Address and Credentials

Once the Linode is running:
1. You'll see the status change to **Running** (green)
2. Note the **IP Address** shown (e.g., `192.0.2.123`)
3. Remember the **sudo username** you created (e.g., `deploy`)

---

## Step 2: Configure DNS (If Using a Domain)

**If you have a domain name**, configure it now while the Linode is booting:

1. Log in to your DNS provider (Cloudflare, Namecheap, Google Domains, etc.)
2. Go to DNS settings for your domain
3. Create an **A Record**:
   - **Name/Host**: `@` (for root domain) or `macguffin` (for subdomain)
   - **Type**: `A`
   - **Value/Points to**: Your Linode IP address
   - **TTL**: `300` (5 minutes) or `Auto`
4. Click **Save**

**Example:**
- Domain: `example.com`
- A Record: `@` → `192.0.2.123`
- Result: `example.com` points to your Linode

**Or for subdomain:**
- A Record: `macguffin` → `192.0.2.123`
- Result: `macguffin.example.com` points to your Linode

DNS propagation usually takes 5-15 minutes.

---

## Step 3: SSH Into Your Linode

### 3.1: Connect via SSH

Open your terminal and connect using the **sudo user** you created:

```bash
ssh YOUR_SUDO_USER@YOUR_LINODE_IP
```

Replace:
- `YOUR_SUDO_USER` with the username you created (e.g., `deploy`)
- `YOUR_LINODE_IP` with your actual IP address

**Example:**
```bash
ssh deploy@192.0.2.123
```

**Note:** If you disabled root SSH access (recommended), you must use the sudo user. If you need root access, use `sudo -i` after logging in.

### 3.2: Verify Docker is Installed

Once connected, verify Docker is running:

```bash
docker --version
docker compose version
```

You should see output like:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

---

## Step 4: Deploy Macguffin Tracker

### 4.1: Switch to Root and Create Application Directory

Since we need to work in `/opt`, switch to root:

```bash
sudo -i
cd /opt
```

Create the application directory:

```bash
mkdir -p /opt/macguffin
cd /opt/macguffin
```

### 4.2: Clone the Repository

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/macguffin-node.git .
```

**Example:**
```bash
git clone https://github.com/sparamona/macguffin-node.git .
```

### 4.3: Create Environment File

Generate a secure JWT secret and create the `.env` file:

```bash
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
BELL_API_KEY=your-bell-api-key-here
ADMIN_EMAIL=admin@test.com
PORT=3000
EOF
```

**Optional:** Edit the `.env` file to customize:
```bash
nano .env
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### 4.4: Start the Application

```bash
docker compose up -d
```

This will:
- Build the Docker image (takes 2-3 minutes first time)
- Start the container in detached mode
- Create the database
- Seed initial data

### 4.5: Verify It's Running

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f
```

Press `Ctrl+C` to exit logs.

### 4.6: Verify Database Initialization

Check the logs to confirm the database was initialized and seeded:

```bash
docker compose logs app | grep -i "database\|initialized"
```

You should see:
```
app-1  | Database initialized
```

### 4.7: Seed Test Data (REQUIRED for Testing)

The database is automatically initialized with the schema and 3 macguffins, but **no users are created**. You need to either:

**Option A: Seed test data (recommended for testing)**

```bash
docker compose exec app npm run seed
```

You should see:
```
Seeding test data...

Creating users...
  ✓ admin@test.com (admin)
  ✓ user@test.com (user)
  ✓ alice@test.com (user)
  ✓ bob@test.com (user)

Creating inventory entries...
  ✓ alice@test.com found Golden Idol
  ✓ alice@test.com found Holy Grail
  ✓ alice@test.com found Maltese Falcon
  ✓ bob@test.com found Golden Idol
  ✓ bob@test.com found Holy Grail
  ✓ user@test.com found Golden Idol

✅ Test data seeded successfully!

Test accounts:
  admin@test.com / password123 (admin)
  user@test.com / password123
  alice@test.com / password123
  bob@test.com / password123
```

**Option B: Create users manually via API**

If you skip seeding, you can create users via the register endpoint:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin2@example.com","password":"yourpassword"}'
```

**Note:** The first user you create won't be an admin. You'll need to manually update the database or use the seeded admin account.

### 4.8: Test the Application

**Test the frontend:**
```bash
curl http://localhost:3000
```

You should see HTML output from the React app.

**Test the API:**
```bash
# Check leaderboard
curl http://localhost:3000/api/leaderboard

# Should show alice (3), bob (2), user (1) if you seeded data
# Should show [] if you didn't seed data
```

**Access from your browser:**
- Open `http://YOUR_LINODE_IP:3000`
- You should see the Macguffin Tracker login page

**If you seeded data:**
- Login with: `admin@test.com` / `password123`
- You should see the leaderboard with alice, bob, and user
- As admin, you can access the Admin Panel to manage macguffins

**If you didn't seed data:**
- You'll need to register a new account first
- The leaderboard will be empty until users add macguffins to their inventory

**Note:** At this point, port 3000 is exposed to the internet. We'll secure it in Step 5 by adding nginx-proxy, or in Step 6 by configuring the firewall.

---

## Step 4.9: User Management

### Interactive User Management Script (Recommended)

The easiest way to manage users is with the interactive script:

```bash
docker compose exec app npm run manage-users
```

This will show a menu:

```
╔════════════════════════════════════════╗
║     Macguffin User Management          ║
╚════════════════════════════════════════╝

  1. List all users
  2. Add new user
  3. Delete user
  4. Change user password
  5. Toggle admin status
  6. Exit

Select an option (1-6):
```

**Features:**
- ✅ Add new users (with option to make them admin)
- ✅ Delete users (with confirmation)
- ✅ Change passwords
- ✅ Toggle admin status
- ✅ List all users with roles
- ✅ Input validation
- ✅ User-friendly interface

### Creating Users (Alternative Methods)

**Method 1: Via Registration API (For End Users)**

Users can self-register through the web interface or API:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "newuser@example.com",
    "is_admin": false
  }
}
```

**Method 2: Via Seed Script (Testing Only)**

```bash
docker compose exec app npm run seed
```

Creates 4 test users (see Step 4.7 above).

### User Management via Database (Advanced)

If you prefer direct database access instead of the interactive script:

```bash
# Access the database
docker compose exec app sh -c "apk add sqlite && sqlite3 /data/macguffin.db"
```

Common queries:
```sql
-- List all users
SELECT email, is_admin, created_at FROM users;

-- Make a user admin
UPDATE users SET is_admin = 1 WHERE email = 'user@example.com';

-- Delete a user
DELETE FROM users WHERE email = 'user@example.com';

-- Exit
.quit
```

### User Management Summary

| Task | Recommended Method | Alternative |
|------|-------------------|-------------|
| Create user | `npm run manage-users` → Option 2 | Registration API |
| Create admin | `npm run manage-users` → Option 2 → Make admin? y | SQL: `UPDATE users SET is_admin = 1` |
| List users | `npm run manage-users` → Option 1 | SQL: `SELECT email, is_admin FROM users` |
| Delete user | `npm run manage-users` → Option 3 | SQL: `DELETE FROM users WHERE email = '...'` |
| Change password | `npm run manage-users` → Option 4 | Delete and re-register |
| Toggle admin | `npm run manage-users` → Option 5 | SQL: `UPDATE users SET is_admin = ...` |

---

## Step 4.10: Common Operations

### Update and Restart (After git pull)

**Quick restart (no code changes):**
```bash
cd /opt/macguffin
docker compose restart
```

**After pulling code changes:**
```bash
cd /opt/macguffin
git pull origin main
docker compose build
docker compose up -d
```

**Force rebuild (if build cache causes issues):**
```bash
cd /opt/macguffin
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### When to Use Each:

| Scenario | Command |
|----------|---------|
| App crashed, need to restart | `docker compose restart` |
| Pulled code changes (any .js, .jsx, .css files) | `docker compose build && docker compose up -d` |
| Build cache issues or major changes | `docker compose build --no-cache && docker compose up -d` |
| Changed environment variables only | Edit `.env` or `docker-compose.yml`, then `docker compose up -d` |

**Note:** Since code is copied into the Docker image, any code changes require rebuilding the image. The `build` command is fast because Docker caches unchanged layers.

### View Logs

```bash
# Follow logs in real-time
docker compose logs -f app

# View last 100 lines
docker compose logs --tail=100 app

# View all logs
docker compose logs app
```

### Check Status

```bash
# Check if containers are running
docker compose ps

# Check resource usage
docker stats
```

### Backup Database

```bash
# Create backup
cp data/macguffin.db data/macguffin.db.backup-$(date +%Y%m%d)

# Or copy to your local machine
scp deploy@YOUR_LINODE_IP:/opt/macguffin/data/macguffin.db ./macguffin-backup.db
```

### Restore Database

```bash
# Stop the app
docker compose down

# Restore from backup
cp data/macguffin.db.backup-20250124 data/macguffin.db

# Start the app
docker compose up -d
```

---

## Step 5: Setup Nginx Reverse Proxy with SSL (Production)

**Skip this step if you don't have a domain name.** You can use the app at `http://YOUR_IP:3000`

For production deployment with a domain and automatic SSL:

### 5.1: Verify DNS is Propagated

Before setting up SSL, verify your domain points to your Linode:

```bash
# Check DNS resolution
dig +short yourdomain.com

# Or use nslookup
nslookup yourdomain.com
```

It should return your Linode's IP address. If not, wait a few more minutes.

### 5.2: Create Nginx Proxy Configuration

```bash
cd /opt/macguffin

# Create nginx-proxy directory
mkdir -p nginx-proxy

# Create docker-compose.override.yml
cat > docker-compose.override.yml << 'EOF'
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy:latest
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./nginx-proxy/certs:/etc/nginx/certs
      - ./nginx-proxy/vhost:/etc/nginx/vhost.d
      - ./nginx-proxy/html:/usr/share/nginx/html
    labels:
      - "com.github.nginx-proxy.nginx"
    restart: unless-stopped
    networks:
      - macguffin-network

  acme-companion:
    image: nginxproxy/acme-companion:latest
    container_name: nginx-proxy-acme
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./nginx-proxy/certs:/etc/nginx/certs
      - ./nginx-proxy/vhost:/etc/nginx/vhost.d
      - ./nginx-proxy/html:/usr/share/nginx/html
      - ./nginx-proxy/acme:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=REPLACE_WITH_YOUR_EMAIL
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    networks:
      - macguffin-network

  app:
    environment:
      - VIRTUAL_HOST=REPLACE_WITH_YOUR_DOMAIN
      - LETSENCRYPT_HOST=REPLACE_WITH_YOUR_DOMAIN
      - LETSENCRYPT_EMAIL=REPLACE_WITH_YOUR_EMAIL
    expose:
      - "3000"
    ports: []
    networks:
      - macguffin-network

networks:
  macguffin-network:
    driver: bridge
EOF
```

### 5.3: Update Configuration with Your Domain

**Option A: Using sed (quick)**

```bash
# Replace with your actual domain and email
sed -i 's/REPLACE_WITH_YOUR_DOMAIN/yourdomain.com/g' docker-compose.override.yml
sed -i 's/REPLACE_WITH_YOUR_EMAIL/admin@yourdomain.com/g' docker-compose.override.yml
```

**Option B: Using nano (manual)**

```bash
nano docker-compose.override.yml
```

Find and replace:
- `REPLACE_WITH_YOUR_DOMAIN` → your actual domain (e.g., `macguffin.example.com`)
- `REPLACE_WITH_YOUR_EMAIL` → your email (e.g., `admin@example.com`)

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### 5.4: Restart with SSL Configuration

```bash
# Stop current containers
docker compose down

# Start with new configuration (includes nginx-proxy and SSL)
docker compose up -d

# Watch the logs to see SSL certificate being obtained
docker compose logs -f acme-companion
```

You should see messages about obtaining certificates from Let's Encrypt. This takes 30-60 seconds.

Press `Ctrl+C` to exit logs.

### 5.5: Verify SSL is Working

```bash
# Test HTTPS
curl -I https://yourdomain.com
```

You should see `HTTP/2 200` or `HTTP/1.1 200` in the response.

**Access from your browser:**
- Open `https://yourdomain.com` (note the `https`)
- You should see a valid SSL certificate (green padlock)
- Login with: `admin@test.com` / `password123`

---

## Step 6: Configure Firewall

### 6.1: Install and Configure UFW

**IMPORTANT:** The firewall configuration differs based on whether you're using nginx-proxy or not.

#### If Using Nginx-Proxy (with domain and SSL):

```bash
# UFW should already be installed on Linode's Docker image, but just in case:
apt update
apt install -y ufw

# Reset firewall to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT - don't lock yourself out!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS for nginx-proxy
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# IMPORTANT: Do NOT allow port 3000
# The docker-compose.override.yml removes port 3000 exposure
# Only nginx-proxy (ports 80/443) should be accessible

# Enable firewall
ufw --force enable
```

**Security Note:** When using nginx-proxy, port 3000 is **NOT** exposed to the internet. The `docker-compose.override.yml` removes the port mapping, so only nginx-proxy can access the app container via Docker's internal network.

#### If NOT Using Nginx-Proxy (direct access without domain):

```bash
# Reset firewall to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow direct access to app
ufw allow 3000/tcp comment 'Macguffin App'

# Enable firewall
ufw --force enable
```

### 6.2: Verify Firewall Status

```bash
ufw status verbose
```

**With nginx-proxy, you should see:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                   # SSH
80/tcp                     ALLOW IN    Anywhere                   # HTTP
443/tcp                    ALLOW IN    Anywhere                   # HTTPS
```

**Without nginx-proxy, you should see:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                   # SSH
3000/tcp                   ALLOW IN    Anywhere                   # Macguffin App
```

### 6.3: Verify Port 3000 is NOT Exposed (if using nginx-proxy)

```bash
# Check what ports Docker is exposing
docker compose ps

# Check what's listening on port 3000
netstat -tlnp | grep 3000
```

**Expected result with nginx-proxy:**
- `netstat` should show **nothing** on `0.0.0.0:3000` (good!)
- Port 3000 should only be accessible within Docker's internal network
- Only ports 80 and 443 should be exposed to the internet

**If you see `0.0.0.0:3000` in netstat output:**
This means port 3000 is exposed to the internet! Make sure you created the `docker-compose.override.yml` file correctly in Step 5.

---

## Step 7: Install Fail2ban (Optional but Recommended)

Protect against brute-force SSH attacks:

```bash
# Install fail2ban
apt install -y fail2ban

# Enable and start
systemctl enable fail2ban
systemctl start fail2ban

# Check status
fail2ban-client status
```

---

## Step 8: Security Verification

### 8.1: Verify Port 3000 is Secured

From your **local machine** (not the server), test if port 3000 is accessible:

```bash
# This should FAIL (connection refused or timeout) if using nginx-proxy:
curl http://YOUR_LINODE_IP:3000

# This should SUCCEED if using nginx-proxy:
curl https://yourdomain.com
```

**Expected results with nginx-proxy:**
- ❌ `curl http://YOUR_LINODE_IP:3000` - **Should fail** (port not exposed)
- ✅ `curl https://yourdomain.com` - **Should succeed** (nginx-proxy working)

**If port 3000 is accessible from the internet:**
1. Check that `docker-compose.override.yml` was created correctly
2. Verify it contains `ports: []` under the `app` service
3. Restart: `docker compose down && docker compose up -d`

### 8.2: Verify Firewall is Active

```bash
# On the server
ufw status verbose

# Should show "Status: active"
```

### 8.3: Test SSL Certificate

```bash
# From your local machine
curl -I https://yourdomain.com

# Should show "HTTP/2 200" or "HTTP/1.1 200"
# Should NOT show certificate errors
```

### 8.4: Security Checklist

- [ ] Port 3000 is NOT accessible from the internet (if using nginx-proxy)
- [ ] Firewall (UFW) is enabled and active
- [ ] Only ports 22, 80, 443 are open (or 22, 3000 if not using nginx-proxy)
- [ ] SSL certificate is valid (if using domain)
- [ ] Fail2ban is running
- [ ] SSH key authentication is configured
- [ ] Default admin password has been changed

---

## Updating the Application

To update your application with the latest code from git:

```bash
# SSH into your Linode (use your sudo user)
ssh deploy@YOUR_LINODE_IP

# Switch to root
sudo -i

# Navigate to app directory
cd /opt/macguffin

# Pull latest changes
git pull origin main

# Rebuild and restart containers (no cache to ensure fresh build)
docker compose build --no-cache

# Restart with new image
docker compose up -d

# Check logs to verify it's working
docker compose logs -f app
```

Press `Ctrl+C` to exit logs.

**The update process:**
1. Pulls latest code from GitHub
2. Rebuilds the Docker image with new code (including any Dockerfile changes)
3. Restarts the container with the new image
4. Database persists (stored in Docker volume)

**Important:** Always use `--no-cache` when rebuilding to ensure all changes are picked up, especially if the Dockerfile or dependencies changed.

---

## Troubleshooting

### Error: ENOENT: no such file or directory

If you see errors about missing files (`init_db.sql`, `dist/index.html`, etc.), the Docker image was built from an older version. Pull the latest changes and rebuild:

```bash
cd /opt/macguffin
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs -f app
```

You should see `Database initialized` and `Server running on port 3000` in the logs.

### Check application logs
```bash
cd /opt/macguffin
docker compose logs -f app
```

### Check all container logs
```bash
docker compose logs -f
```

### Check if containers are running
```bash
docker compose ps
```

### Restart containers
```bash
docker compose restart
```

### Rebuild containers from scratch
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Access container shell
```bash
docker compose exec app sh
```

### View database contents

Check what's in the database:

```bash
# Access the database
docker compose exec app sh -c "apk add sqlite && sqlite3 /data/macguffin.db"
```

Then run SQL queries:
```sql
-- Check tables exist
.tables

-- Check macguffins (should have 3)
SELECT * FROM macguffins;

-- Check users (empty unless you ran seed)
SELECT email, is_admin FROM users;

-- Check leaderboard
SELECT
  user_email,
  COUNT(*) as macguffin_count
FROM user_inventory
GROUP BY user_email
ORDER BY macguffin_count DESC;

-- Exit
.quit
```

**Expected results:**
- **macguffins table**: 3 rows (Golden Idol, Holy Grail, Maltese Falcon)
- **users table**: 0 rows (unless you ran `npm run seed`)
- **user_inventory table**: 0 rows (unless you ran `npm run seed`)

### Verify seeded data

If you ran `npm run seed`, verify the data:

```bash
# Check leaderboard via API
curl http://localhost:3000/api/leaderboard
```

Should return:
```json
[
  {"user_email":"alice@test.com","macguffin_count":3},
  {"user_email":"bob@test.com","macguffin_count":2},
  {"user_email":"user@test.com","macguffin_count":1}
]
```

### Check port 3000 is listening
```bash
netstat -tlnp | grep 3000
# or
docker compose ps
```

---

## Security Summary

### Architecture Overview

**With nginx-proxy (recommended):**
```
Internet
   ↓
UFW Firewall (ports 22, 80, 443 only)
   ↓
Nginx Proxy (port 80/443) → SSL termination
   ↓
Docker Internal Network (not exposed to internet)
   ↓
App Container (port 3000 - internal only)
```

**Without nginx-proxy (direct access):**
```
Internet
   ↓
UFW Firewall (ports 22, 3000 only)
   ↓
App Container (port 3000 - exposed)
```

### What You've Set Up:

✅ **Docker Isolation** - Application runs in isolated container
✅ **Firewall (UFW)** - Only necessary ports open (22, 80, 443)
✅ **Port 3000 Secured** - NOT exposed to internet when using nginx-proxy
✅ **Fail2ban** - Automatic IP blocking after failed SSH attempts
✅ **SSH Key Authentication** - If you added your SSH key during Linode creation
✅ **Nginx Reverse Proxy** - If domain configured, hides Node.js behind Nginx
✅ **SSL/TLS** - Automatic Let's Encrypt certificate with auto-renewal
✅ **Non-root Container** - App runs as non-root user inside container

### How Port 3000 is Secured:

When using nginx-proxy:
1. The base `docker-compose.yml` exposes port 3000 for development
2. The `docker-compose.override.yml` **removes** the port mapping with `ports: []`
3. Docker Compose merges these files, resulting in NO external port exposure
4. Port 3000 is only accessible within Docker's internal network
5. Only nginx-proxy can reach the app container via the `macguffin-network` bridge
6. The firewall blocks port 3000 from the internet
7. Users can only access via ports 80/443 through nginx-proxy

## Security Recommendations

1. **Change default passwords** - Update test account passwords immediately after first login
2. **Regular backups** - Backup Docker volume: `docker run --rm -v macguffin-node_macguffin-data:/data -v $(pwd):/backup alpine tar czf /backup/macguffin-backup.tar.gz /data`
3. **Update regularly** - Run `git pull && docker compose build --no-cache && docker compose up -d` weekly
4. **Monitor logs** - Check `docker compose logs -f` for suspicious activity
5. **Database backups** - Set up automated backups of the SQLite database volume

---

## Quick Reference Commands

### Check firewall status
```bash
ufw status verbose
```

### Check fail2ban status
```bash
fail2ban-client status
fail2ban-client status sshd
```

### Backup database
```bash
cd /opt/macguffin
docker run --rm -v macguffin-node_macguffin-data:/data -v $(pwd):/backup alpine tar czf /backup/macguffin-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore database
```bash
cd /opt/macguffin
docker run --rm -v macguffin-node_macguffin-data:/data -v $(pwd):/backup alpine tar xzf /backup/macguffin-backup-YYYYMMDD.tar.gz -C /
docker compose restart
```

### View container resource usage
```bash
docker stats
```

### Clean up old Docker images
```bash
docker system prune -a
```

---

## Summary

You now have a production-ready Macguffin Tracker deployment on Linode with:

- ✅ Docker containerization for easy updates and isolation
- ✅ Automatic SSL certificates with Let's Encrypt
- ✅ Nginx reverse proxy for security and performance
- ✅ Firewall protection with UFW
- ✅ Brute-force protection with fail2ban
- ✅ Persistent database storage in Docker volumes
- ✅ One-command updates via `git pull`

**Next steps:**
1. Login and change the admin password
2. Create your users
3. Start tracking macguffins!

**Support:**
- Check logs: `docker compose logs -f`
- Restart: `docker compose restart`
- Update: `git pull && docker compose build --no-cache && docker compose up -d`

