#!/usr/bin/env bash
# One-time host bootstrap for a BSLT DigitalOcean Ubuntu droplet.
# Safe to re-run: it only creates what is missing and updates packages.

set -euo pipefail

APP_NAME="bslt"
DEPLOY_USER="bslt"
SSH_PORT="22"

usage() {
  cat <<USAGE
Usage: $0 [--app-name <name>] [--deploy-user <user>] [--ssh-port <port>]

Examples:
  sudo $0
  sudo $0 --app-name myapp --deploy-user deploy
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --deploy-user)
      DEPLOY_USER="$2"
      shift 2
      ;;
    --ssh-port)
      SSH_PORT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (e.g., sudo $0)"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] Updating apt and base packages"
apt-get update
apt-get upgrade -y
apt-get install -y \
  ca-certificates \
  curl \
  fail2ban \
  git \
  htop \
  jq \
  ufw \
  unattended-upgrades

echo "[2/7] Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker
systemctl restart docker

echo "[3/7] Creating deployment user (if missing)"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

if [ -f /root/.ssh/authorized_keys ]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

echo "[4/7] Preparing deployment directories"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/deployments/$APP_NAME/production"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/deployments/$APP_NAME/staging"

echo "[5/7] Configuring firewall and hardening"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT"/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

dpkg-reconfigure --frontend=noninteractive unattended-upgrades
systemctl enable fail2ban
systemctl restart fail2ban

echo "[6/7] Optional SSH hardening"
SSHD_CONFIG="/etc/ssh/sshd_config"
if ! grep -q '^PasswordAuthentication no' "$SSHD_CONFIG"; then
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' "$SSHD_CONFIG"
fi
if ! grep -q '^PermitRootLogin prohibit-password' "$SSHD_CONFIG"; then
  if grep -q '^#\?PermitRootLogin ' "$SSHD_CONFIG"; then
    sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
  else
    echo 'PermitRootLogin prohibit-password' >> "$SSHD_CONFIG"
  fi
fi
systemctl restart ssh

echo "[7/7] Cleanup"
apt-get autoremove -y
apt-get clean

echo
echo "Bootstrap complete."
echo "Next: configure GitHub secrets/variables, then run deployment workflows."
