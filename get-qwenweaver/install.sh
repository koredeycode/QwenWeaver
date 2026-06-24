#!/usr/bin/env sh
set -eu

INSTALL_DIR="${QWENWEAVER_HOME:-/opt/qwenweaver}"
REPO_URL="${QWENWEAVER_REPO_URL:-https://github.com/qwenweaver/qwenweaver.git}"
REPO_BRANCH="${QWENWEAVER_REPO_BRANCH:-main}"
PORT="${QWENWEAVER_PORT:-3001}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when installing as a non-root user."
    exit 1
  fi
  SUDO="sudo"
fi

ANALYTICS_OPT_IN="${QWENWEAVER_ANALYTICS_OPT_IN:-}"

say() { printf '%s\n' "$*"; }
fail() { say "Error: $*"; exit 1; }

require_linux() {
  [ "$(uname -s)" = "Linux" ] || fail "QwenWeaver's VPS installer currently supports Linux hosts."
  if [ -r /etc/os-release ]; then
    . /etc/os-release 2>/dev/null || true
    case "${ID:-}" in
      ubuntu|debian) ;;
      *) say "Warning: tuned for Ubuntu/Debian. Continuing on ${PRETTY_NAME:-unknown Linux}." ;;
    esac
  fi
}

require_apt() {
  command -v apt-get >/dev/null 2>&1 || fail "apt-get not found. Currently supports Ubuntu/Debian hosts."
}

install_base_packages() {
  require_apt
  say "Installing base packages..."
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl git openssl build-essential python3
}

node_major_version() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || printf '0\n'
}

install_node() {
  if command -v node >/dev/null 2>&1 && [ "$(node_major_version)" -ge 22 ]; then
    return
  fi
  say "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    if command -v systemctl >/dev/null 2>&1; then
      $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
    fi
    return
  fi
  say "Installing Docker..."
  $SUDO apt-get install -y docker.io
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
  fi
}

install_compose_package() {
  for pkg in docker-compose-plugin docker-compose-v2; do
    if apt-cache show "$pkg" >/dev/null 2>&1; then
      $SUDO apt-get install -y "$pkg"
      return
    fi
  done
  fail "Docker Compose v2 not found in apt. Enable Docker's apt repository, then rerun."
}

require_compose() {
  if $SUDO docker compose version >/dev/null 2>&1; then return; fi
  say "Installing Docker Compose plugin..."
  install_compose_package
  $SUDO docker compose version >/dev/null 2>&1 || fail "Docker Compose still unavailable."
}

install_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then return; fi
  say "Installing pnpm..."
  npm install -g pnpm@latest
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
    return
  fi
  dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
}

detect_public_url() {
  if [ -n "${QWENWEAVER_PUBLIC_URL:-}" ]; then
    printf '%s\n' "$QWENWEAVER_PUBLIC_URL"
    return
  fi
  public_ip=""
  if command -v curl >/dev/null 2>&1; then
    public_ip="$(curl -fsSL --max-time 4 https://api.ipify.org 2>/dev/null || true)"
  fi
  if [ -z "$public_ip" ] && command -v hostname >/dev/null 2>&1; then
    public_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [ -z "$public_ip" ]; then public_ip="localhost"; fi
  printf 'http://%s:%s\n' "$public_ip" "$PORT"
}

get_env_value() {
  env_file="$1"; key="$2"
  [ -f "$env_file" ] || return 0
  value="$(grep "^$key=" "$env_file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "$value" | sed "s/^[\"']//;s/[\"']$//"
}

write_env_file() {
  env_file="$INSTALL_DIR/.env"
  jwt_secret="$(get_env_value "$env_file" JWT_SECRET)"
  dashscope_key="$(get_env_value "$env_file" DASHSCOPE_API_KEY)"
  public_url="$(get_env_value "$env_file" PUBLIC_URL)"

  [ -z "$jwt_secret" ] && jwt_secret="$(random_secret)"
  [ -z "$public_url" ] && public_url="$(detect_public_url)"

  tmp_file="$(mktemp)"
  if [ -f "$env_file" ]; then
    grep -v -E '^(INSTALL_MODE|JWT_SECRET|DASHSCOPE_API_KEY|DATABASE_URL|PORT|HOST|PUBLIC_URL|LOG_LEVEL|CORS_ORIGINS|DISABLE_ANALYTICS|QWENWEAVER_ENV_PATH|INSTALL_COMMIT_SHA)=' "$env_file" > "$tmp_file" || true
  else
    : > "$tmp_file"
  fi

  cat >> "$tmp_file" <<EOF
INSTALL_MODE=$INSTALL_MODE
QWENWEAVER_ENV_PATH=$INSTALL_DIR/.env
JWT_SECRET=$jwt_secret
DASHSCOPE_API_KEY=$dashscope_key
DATABASE_URL=$INSTALL_DIR/data/qwenweaver.db
PORT=$PORT
HOST=0.0.0.0
PUBLIC_URL=$public_url
LOG_LEVEL=info
CORS_ORIGINS=$public_url
DISABLE_ANALYTICS=false
EOF

  mv "$tmp_file" "$env_file"
}

write_docker_compose() {
  mkdir -p "$INSTALL_DIR"
  cat > "$INSTALL_DIR/docker-compose.yml" <<'EOF'
services:
  qwenweaver:
    image: ghcr.io/qwenweaver/qwenweaver:latest
    container_name: qwenweaver
    restart: unless-stopped
    ports:
      - "${PORT:-3001}:3001"
    environment:
      NODE_ENV: production
      PORT: ${PORT:-3001}
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: /data/qwenweaver.db
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY:-}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3001}
      DISABLE_ANALYTICS: ${DISABLE_ANALYTICS:-false}
    volumes:
      - qwenweaver-data:/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  qwenweaver-data:
EOF
}

write_systemd_unit() {
  command -v systemctl >/dev/null 2>&1 || fail "systemd required for $INSTALL_MODE install."

  if [ "$INSTALL_MODE" = "git" ]; then
    working_dir="$INSTALL_DIR/source"
    exec_start="/usr/bin/env node packages/cli/dist/index.js start"
  else
    working_dir="$INSTALL_DIR"
    exec_start="/usr/bin/env node /usr/lib/node_modules/@qwenweaver/cli/dist/index.js start"
  fi

  $SUDO tee /etc/systemd/system/qwenweaver.service >/dev/null <<EOF
[Unit]
Description=QwenWeaver
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$working_dir
Environment=NODE_ENV=production
Environment=QWENWEAVER_ENV_PATH=$INSTALL_DIR/.env
EnvironmentFile=-$INSTALL_DIR/.env
ExecStart=$exec_start
Restart=always
RestartSec=3
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
EOF
}

install_npm_mode() {
  say "Installing QwenWeaver via npm..."
  npm install -g @qwenweaver/cli
  write_systemd_unit
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now qwenweaver
}

install_docker_mode() {
  install_docker
  require_compose
  say "Setting up QwenWeaver with Docker..."
  write_docker_compose
  cd "$INSTALL_DIR"
  $SUDO docker compose up -d
}

install_git_mode() {
  require_apt
  install_base_packages
  install_node
  install_pnpm
  install_docker

  say "Creating $INSTALL_DIR..."
  $SUDO mkdir -p "$INSTALL_DIR/data"
  if [ -n "$SUDO" ]; then
    $SUDO chown -R "$(id -u):$(id -g)" "$INSTALL_DIR"
  fi

  source_dir="$INSTALL_DIR/source"
  if [ -d "$source_dir/.git" ]; then
    say "Updating QwenWeaver source..."
    git -C "$source_dir" fetch origin "$REPO_BRANCH"
    git -C "$source_dir" checkout "$REPO_BRANCH"
    git -C "$source_dir" pull --ff-only origin "$REPO_BRANCH"
  elif [ -d "$source_dir" ] && [ -z "$(ls -A "$source_dir" 2>/dev/null)" ]; then
    rmdir "$source_dir"
    git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$source_dir"
  else
    git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$source_dir"
  fi

  cd "$source_dir"
  say "Installing dependencies..."
  pnpm install --frozen-lockfile
  say "Building QwenWeaver..."
  pnpm build
  pnpm prune --prod
  write_systemd_unit
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now qwenweaver
}

choose_mode() {
  if [ -n "${QWENWEAVER_INSTALL_MODE:-}" ]; then
    INSTALL_MODE="$QWENWEAVER_INSTALL_MODE"
    return
  fi
  say ""
  say "Choose install mode:"
  say "  1) npm CLI (default) — install via npm, managed with systemd"
  say "  2) Docker — containerized with docker-compose"
  say "  3) Git — clone source, build, and run with systemd"
  say ""
  printf "Enter choice [1]: "
  read -r choice
  case "${choice:-1}" in
    1|"") INSTALL_MODE="npm" ;;
    2) INSTALL_MODE="docker" ;;
    3) INSTALL_MODE="git" ;;
    *) say "Invalid choice, defaulting to npm."; INSTALL_MODE="npm" ;;
  esac
}

ask_analytics() {
  if [ -n "$ANALYTICS_OPT_IN" ]; then return; fi
  printf "Send anonymous install stats? (y/N): "
  read -r ans
  case "$ans" in
    y|Y|yes|Yes) ANALYTICS_OPT_IN="true" ;;
    *) ANALYTICS_OPT_IN="false" ;;
  esac
}

maybe_send_analytics() {
  if [ "$ANALYTICS_OPT_IN" != "true" ]; then return; fi
  if command -v curl >/dev/null 2>&1; then
    payload="{\"mode\":\"$INSTALL_MODE\",\"os\":\"$(uname -s)\",\"arch\":\"$(uname -m)\",\"node\":\"$(node -v 2>/dev/null || unknown)\"}"
    curl -fsSL --max-time 3 -X POST https://get.qwenweaver.io/analytics \
      -H "Content-Type: application/json" \
      -d "$payload" >/dev/null 2>&1 || true
  fi
}

print_firewall_hint() {
  if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -qi "Status: active"; then
    say ""
    say "UFW is active. Make sure these ports are allowed:"
    say "  sudo ufw allow $PORT/tcp"
  fi
}

main() {
  require_linux
  choose_mode
  ask_analytics

  $SUDO mkdir -p "$INSTALL_DIR/data"
  if [ -n "$SUDO" ]; then
    $SUDO chown -R "$(id -u):$(id -g)" "$INSTALL_DIR"
  fi

  write_env_file
  case "$INSTALL_MODE" in
    npm) install_npm_mode ;;
    docker) install_docker_mode ;;
    git) install_git_mode ;;
  esac

  maybe_send_analytics

  public_url="$(get_env_value "$INSTALL_DIR/.env" PUBLIC_URL)"
  print_firewall_hint
  say ""
  say "QwenWeaver is installed."
  say "Open: $public_url"
  say ""
  if [ "$INSTALL_MODE" = "npm" ] || [ "$INSTALL_MODE" = "git" ]; then
    say "Manage it with:"
    say "  sudo journalctl -u qwenweaver -f"
  fi
  if [ "$INSTALL_MODE" = "docker" ]; then
    say "Manage it with:"
    say "  cd $INSTALL_DIR && sudo docker compose logs -f"
  fi
}

main "$@"
