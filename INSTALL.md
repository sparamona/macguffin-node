# Macguffin Tracker - Linode Installation Guide

## One-Click Installation with StackScript

### Step 1: Create a Linode StackScript

1. Log in to [Linode Cloud Manager](https://cloud.linode.com)
2. Navigate to **StackScripts** in the left sidebar
3. Click **Create StackScript**
4. Name it: `Macguffin Tracker Installer`
5. Copy and paste the script from `stackscript.sh` (see below)
6. Click **Save**

### Step 2: Deploy a New Linode

1. Click **Create Linode**
2. Choose **StackScripts** tab
3. Select **Account StackScripts**
4. Find and select `Macguffin Tracker Installer`
5. Fill in the UDF fields:
   - **JWT_SECRET**: A strong random secret (e.g., generate with `openssl rand -hex 32`)
   - **BELL_API_KEY**: Your bell API key (or leave default)
   - **ADMIN_EMAIL**: Admin user email (default: admin@test.com)
   - **GIT_REPO**: Your git repository URL (default: https://github.com/yourusername/macguffin-node.git)
6. Choose your Linode plan (Nanode 1GB is sufficient)
7. Choose a region
8. Set a root password
9. Click **Create Linode**

### Step 3: Access Your Application

1. Wait 3-5 minutes for the StackScript to complete
2. Find your Linode's IP address in the Cloud Manager
3. Open browser to: `http://YOUR_LINODE_IP:3000`
4. Login with: `admin@test.com` / `password123`

---

## Manual Installation (Alternative)

If you prefer to install manually:

```bash
# SSH into your Linode
ssh root@YOUR_LINODE_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Clone repository
cd /opt
git clone YOUR_GIT_REPO macguffin-tracker
cd macguffin-tracker

# Install dependencies
cd server
npm install
cd ../client
npm install
cd ..

# Build client
cd client
npm run build
cd ..

# Create environment file
cat > /opt/macguffin-tracker/.env << EOF
JWT_SECRET=your-secret-here
BELL_API_KEY=your-bell-api-key
ADMIN_EMAIL=admin@test.com
PORT=3000
DB_PATH=/opt/macguffin-tracker/data/macguffin.db
EOF

# Create data directory
mkdir -p /opt/macguffin-tracker/data

# Create systemd service
cat > /etc/systemd/system/macguffin.service << EOF
[Unit]
Description=Macguffin Tracker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/macguffin-tracker/server
EnvironmentFile=/opt/macguffin-tracker/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start service
systemctl daemon-reload
systemctl enable macguffin
systemctl start macguffin

# Check status
systemctl status macguffin
```

---

## Updating the Application

To update your application with the latest code from git:

```bash
# SSH into your Linode
ssh root@YOUR_LINODE_IP

# Navigate to app directory
cd /opt/macguffin-tracker

# Pull latest changes
git pull origin main

# Install any new dependencies
cd server
npm install
cd ../client
npm install
cd ..

# Rebuild client
cd client
npm run build
cd ..

# Restart service
systemctl restart macguffin

# Check status
systemctl status macguffin
```

---

## Troubleshooting

### Check application logs
```bash
journalctl -u macguffin -f
```

### Check if service is running
```bash
systemctl status macguffin
```

### Restart service
```bash
systemctl restart macguffin
```

### Check port 3000 is listening
```bash
netstat -tlnp | grep 3000
```

### View database
```bash
cd /opt/macguffin-tracker/server
npm run db
```

---

## Security Recommendations

1. **Change default passwords** - Update test account passwords in production
2. **Use a reverse proxy** - Set up Nginx with SSL/TLS
3. **Enable firewall** - Use UFW to restrict access
4. **Regular backups** - Backup `/opt/macguffin-tracker/data/macguffin.db`
5. **Update regularly** - Run `git pull` and restart service weekly

---

## Optional: Setup Nginx Reverse Proxy with SSL

```bash
# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/macguffin << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/macguffin /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate (replace YOUR_DOMAIN.com)
certbot --nginx -d YOUR_DOMAIN.com
```

