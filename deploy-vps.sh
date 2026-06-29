#!/bin/bash
# deploy-vps.sh — Deploy QwenWeaver to VPS
# Usage: bash deploy-vps.sh <vps-host> [vps-user]
# Requires: .env file in current directory, SSH key for VPS

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS_HOST="${1:-${VPS_HOST:-}}"
VPS_USER="${2:-${VPS_USER:-deploy}}"
DEPLOY_DIR="/home/$VPS_USER/qwenweaver"

if [ -z "$VPS_HOST" ]; then
  echo -e "${RED}Error: VPS_HOST not provided${NC}"
  echo "Usage: bash deploy-vps.sh <vps-host> [vps-user]"
  echo "Or set: export VPS_HOST=your.vps.ip"
  exit 1
fi

if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found in current directory${NC}"
  exit 1
fi

echo -e "${YELLOW}=== QwenWeaver VPS Deployment ===${NC}"
echo "Target: $VPS_USER@$VPS_HOST:$DEPLOY_DIR"
echo ""

# Verify SSH connectivity
echo -e "${YELLOW}Verifying SSH connectivity...${NC}"

# Pre-populate known_hosts to prevent MITM attacks
ssh-keyscan -H "$VPS_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true

if ! ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
  echo -e "${RED}Cannot connect to VPS${NC}"
  exit 1
fi
echo -e "${GREEN}SSH connectivity OK${NC}"

# Copy .env and SPAs to VPS
echo -e "${YELLOW}Copying files to VPS...${NC}"
scp .env "$VPS_USER@$VPS_HOST:$DEPLOY_DIR/"

for artifact in site-dist.tar.gz app-dist.tar.gz; do
  if [ -f "$artifact" ]; then
    scp "$artifact" "$VPS_USER@$VPS_HOST:$DEPLOY_DIR/www/"
  fi
done

# Execute deploy commands on VPS
echo -e "${YELLOW}Deploying on VPS...${NC}"
ssh "$VPS_USER@$VPS_HOST" bash -s << 'DEPLOYSCRIPT'
  set -euo pipefail

  cd /home/deploy/qwenweaver

  # Extract SPAs if present
  cd www
  for artifact in site-dist.tar.gz app-dist.tar.gz; do
    if [ -f "$artifact" ]; then
      target_dir="${artifact%-dist.tar.gz}"
      echo "Extracting $artifact to $target_dir..."
      mkdir -p "$target_dir"
      tar xzf "$artifact" -C "$target_dir" --no-same-owner
      rm -f "$artifact"
    fi
  done
  cd ..

  # Verify .env
  if [ ! -f .env ]; then
    echo "ERROR: .env not found"
    exit 1
  fi
  echo ".env found"

  # Pull latest image and restart
  echo "Pulling Docker image..."
  docker compose -f docker-compose.prod.yml pull
  echo "Restarting service..."
  docker compose -f docker-compose.prod.yml up -d --no-deps qwenweaver

  # Run migrations
  echo "Running migrations..."
  docker compose -f docker-compose.prod.yml exec -T qwenweaver node apps/api/dist/migrate.js || echo "Migration command not found"

  # Disk cleanup
  echo "Pruning Docker images..."
  docker image prune -af
  docker builder prune -af

  echo ""
  echo "--- Disk Usage ---"
  df -h /
  echo ""
  echo "--- Container Status ---"
  docker compose -f docker-compose.prod.yml ps
  echo ""
  echo "--- Latest Logs ---"
  docker compose -f docker-compose.prod.yml logs --tail=15 qwenweaver
DEPLOYSCRIPT

DEPLOY_EXIT=$?

if [ $DEPLOY_EXIT -eq 0 ]; then
  echo ""
  echo -e "${GREEN}Deployment completed successfully${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}Deployment failed${NC}"
  echo "SSH into VPS and check logs: ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_DIR && docker compose logs qwenweaver'"
  exit 1
fi
