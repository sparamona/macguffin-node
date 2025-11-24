# Macguffin Tracker - Linode Docker Deployment Guide

## One-Click Deployment with Docker on Linode

This guide will walk you through deploying Macguffin Tracker on Linode using Docker for maximum simplicity and security.

### Prerequisites

- A Linode account ([sign up here](https://www.linode.com))
- A domain name (optional, but recommended for SSL)
- Your SSH public key (generate with `ssh-keygen` if you don't have one)

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

### 1.4: Configure Your Linode

**Image Selection:**
- The Docker Marketplace app will automatically use Ubuntu 22.04 LTS

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
- Create a strong root password (you'll rarely need this)

**SSH Keys (HIGHLY RECOMMENDED):**
1. Click **Add An SSH Key**
2. Paste your SSH public key (from `~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`)
3. Give it a label like "My Laptop"
4. Click **Add Key**

**Advanced Options (optional):**
- Leave defaults unless you have specific needs

### 1.5: Create the Linode

1. Review your selections
2. Click **Create Linode** (bottom right)
3. Wait 2-3 minutes for the Linode to boot

### 1.6: Note Your IP Address

Once the Linode is running:
1. You'll see the status change to **Running** (green)
2. Note the **IP Address** shown (e.g., `192.0.2.123`)

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

Open your terminal and connect:

```bash
ssh root@YOUR_LINODE_IP
```

Replace `YOUR_LINODE_IP` with your actual IP address.

**Example:**
```bash
ssh root@192.0.2.123
```

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

### 4.1: Create Application Directory

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

### 4.6: Test the Application

```bash
curl http://localhost:3000
```

You should see HTML output from the React app.

**Access from your browser:**
- Open `http://YOUR_LINODE_IP:3000`
- You should see the Macguffin Tracker login page
- Login with: `admin@test.com` / `password123`

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
version: '3.8'

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

## Updating the Application

To update your application with the latest code from git:

```bash
# SSH into your Linode
ssh root@YOUR_LINODE_IP

# Navigate to app directory
cd /opt/macguffin

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker compose build --no-cache
docker compose up -d

# Check logs
docker compose logs -f app
```

Press `Ctrl+C` to exit logs.

**The update process:**
1. Pulls latest code from GitHub
2. Rebuilds the Docker image with new code
3. Restarts the container
4. Database persists (stored in Docker volume)

---

## Troubleshooting

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

### View database
```bash
# Install sqlite3 in container
docker compose exec app sh
apk add sqlite
sqlite3 /data/macguffin.db
```

### Check port 3000 is listening
```bash
netstat -tlnp | grep 3000
# or
docker compose ps
```

---

## Security Summary

What you've set up:

✅ **Docker Isolation** - Application runs in isolated container
✅ **Firewall (UFW)** - Only necessary ports open (22, 80, 443)
✅ **Fail2ban** - Automatic IP blocking after failed SSH attempts
✅ **SSH Key Authentication** - If you added your SSH key during Linode creation
✅ **Nginx Reverse Proxy** - If domain configured, hides Node.js behind Nginx
✅ **SSL/TLS** - Automatic Let's Encrypt certificate with auto-renewal
✅ **Non-root Container** - App runs as non-root user inside container

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

