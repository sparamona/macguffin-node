#!/bin/bash

# <UDF name="jwt_secret" label="JWT Secret" default="" example="Generate with: openssl rand -hex 32" />
# <UDF name="bell_api_key" label="Bell API Key" default="your-bell-api-key" />
# <UDF name="admin_email" label="Admin Email" default="admin@test.com" />
# <UDF name="git_repo" label="Git Repository URL" default="https://github.com/yourusername/macguffin-node.git" />

set -e

# Log everything
exec > >(tee -a /var/log/stackscript.log)
exec 2>&1

echo "Starting Macguffin Tracker installation..."

# Update system
echo "Updating system packages..."
apt update
DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Install Node.js 20.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Verify installations
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Clone repository
echo "Cloning repository from ${GIT_REPO}..."
cd /opt
if [ -d "macguffin-tracker" ]; then
    rm -rf macguffin-tracker
fi
git clone "${GIT_REPO}" macguffin-tracker
cd macguffin-tracker

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install --production

# Install client dependencies and build
echo "Installing client dependencies..."
cd ../client
npm install
echo "Building client..."
npm run build

# Create data directory
echo "Creating data directory..."
mkdir -p /opt/macguffin-tracker/data

# Generate JWT secret if not provided
if [ -z "${JWT_SECRET}" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT_SECRET: ${JWT_SECRET}"
fi

# Create environment file
echo "Creating environment file..."
cat > /opt/macguffin-tracker/.env << EOF
JWT_SECRET=${JWT_SECRET}
BELL_API_KEY=${BELL_API_KEY}
ADMIN_EMAIL=${ADMIN_EMAIL}
PORT=3000
DB_PATH=/opt/macguffin-tracker/data/macguffin.db
EOF

# Secure environment file
chmod 600 /opt/macguffin-tracker/.env

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/macguffin.service << 'EOF'
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
echo "Starting Macguffin Tracker service..."
systemctl daemon-reload
systemctl enable macguffin
systemctl start macguffin

# Wait for service to start
sleep 5

# Seed initial data
echo "Seeding initial data..."
cd /opt/macguffin-tracker/server
npm run seed || echo "Seed script failed or already seeded"

# Configure firewall
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 3000/tcp
echo "y" | ufw enable

# Create update script
echo "Creating update script..."
cat > /opt/macguffin-tracker/update.sh << 'EOF'
#!/bin/bash
set -e

echo "Updating Macguffin Tracker..."

cd /opt/macguffin-tracker

# Pull latest changes
echo "Pulling latest code..."
git pull origin main

# Update server dependencies
echo "Updating server dependencies..."
cd server
npm install --production

# Update client dependencies and rebuild
echo "Updating client dependencies..."
cd ../client
npm install
echo "Rebuilding client..."
npm run build

# Restart service
echo "Restarting service..."
systemctl restart macguffin

echo "Update complete!"
systemctl status macguffin
EOF

chmod +x /opt/macguffin-tracker/update.sh

# Print completion message
echo ""
echo "=========================================="
echo "Macguffin Tracker Installation Complete!"
echo "=========================================="
echo ""
echo "Access your application at: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Default login: admin@test.com / password123"
echo ""
echo "To update the application, run:"
echo "  /opt/macguffin-tracker/update.sh"
echo ""
echo "To view logs:"
echo "  journalctl -u macguffin -f"
echo ""
echo "To check status:"
echo "  systemctl status macguffin"
echo ""
echo "=========================================="

