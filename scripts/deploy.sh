#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
DEPLOY_COMPOSE_FILE="$REPO_ROOT/docker-compose.deploy.yml"
NGINX_TEMPLATE="$REPO_ROOT/deploy/nginx/viviora.conf.template"
NGINX_NAME="viviora.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/$NGINX_NAME"
NGINX_ENABLED="/etc/nginx/sites-enabled/$NGINX_NAME"

MODE="host"
DOMAIN=""
CERT_EMAIL=""
SKIP_CERTBOT=0
SKIP_BUILD=0
DRY_RUN=0
FRONTEND_PORT="5080"
BACKEND_PORT="4000"
POSTGRES_PORT="5433"

log() { printf '\n[deploy] %s\n' "$*"; }
warn() { printf '\n[deploy][warning] %s\n' "$*" >&2; }
die() { printf '\n[deploy][error] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/deploy.sh [options]

Options:
  --mode internal|host  Deployment mode (default: host)
  --domain DOMAIN       Public domain, e.g. viviora.bcic.site
  --email EMAIL         Let's Encrypt email (host mode)
  --skip-certbot        Configure HTTP Nginx only
  --skip-build          Skip docker compose build
  --dry-run             Validate and print planned actions only
  -h, --help            Show this help
EOF
}

while (($#)); do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email) CERT_EMAIL="${2:-}"; shift 2 ;;
    --skip-certbot) SKIP_CERTBOT=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

[[ "$MODE" == "host" || "$MODE" == "internal" ]] || die "--mode must be host or internal."
[[ -f "$COMPOSE_FILE" && -f "$REPO_ROOT/frontend/nginx.conf" ]] || die "Run this script from the Viviora repository."
[[ -f "$ENV_FILE" || ! -e "$ENV_FILE" ]] || die "$ENV_FILE is not a regular file."

if ((EUID != 0)); then
  die "Run as root or with sudo: sudo ./scripts/deploy.sh ..."
fi

source_os() {
  [[ -f /etc/os-release ]] || die "Cannot detect operating system."
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" || "${ID:-}" == "debian" || "${ID_LIKE:-}" == *debian* ]] || die "This script supports Ubuntu/Debian only."
}

valid_domain() { [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(\.[A-Za-z]{2,})$ ]]; }
valid_email() { [[ "$1" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; }

prompt_values() {
  if [[ -z "$DOMAIN" ]]; then
    if [[ "$MODE" == "host" ]]; then
      read -r -p "Server domain (e.g. viviora.bcic.site): " DOMAIN
    else
      read -r -p "Domain (optional, press Enter for localhost): " DOMAIN
    fi
  fi
  if [[ "$MODE" == "host" && -z "$CERT_EMAIL" && "$SKIP_CERTBOT" == 0 ]]; then
    read -r -p "Let's Encrypt email: " CERT_EMAIL
  fi
  valid_domain "$DOMAIN" || { [[ "$MODE" == "internal" && -z "$DOMAIN" ]] || die "Invalid domain: $DOMAIN"; }
  if [[ "$MODE" == "host" && "$SKIP_CERTBOT" == 0 ]]; then
    valid_email "$CERT_EMAIL" || die "A valid email is required for Certbot."
  fi
}

run() {
  if ((DRY_RUN)); then printf '[dry-run]'; printf ' %q' "$@"; printf '\n'; return 0; fi
  "$@"
}

apt_install() {
  local packages=() package
  for package in "$@"; do command -v "$package" >/dev/null 2>&1 || packages+=("$package"); done
  ((${#packages[@]} == 0)) && return 0
  ((DRY_RUN)) && { log "Would install: ${packages[*]}"; return 0; }
  apt-get update
  apt-get install -y "${packages[@]}"
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    ((DRY_RUN)) && { log "Would install docker.io and docker-compose-plugin"; return 0; }
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
  fi
  docker compose version >/dev/null 2>&1 || {
    ((DRY_RUN)) && { log "Would install docker-compose-plugin"; return 0; }
    apt-get update
    apt-get install -y docker-compose-plugin
  }
  ((DRY_RUN)) || systemctl enable --now docker
}

env_value() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

set_env_value() {
  local key="$1" value="$2" tmp
  [[ "$value" != *$'\n'* ]] || die "Newline in environment value: $key"
  if [[ ! -f "$ENV_FILE" ]]; then
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
    return
  fi
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { replaced=0 }
    $0 ~ "^" key "=" { if (!replaced) { print key "=" value; replaced=1 }; next }
    { print }
    END { if (!replaced) print key "=" value }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

random_secret() { od -An -hex -N 32 /dev/urandom | tr -d ' \n'; }

ensure_env() {
  local db_name db_user db_password session_secret origin database_url existing
  if [[ ! -e "$ENV_FILE" ]]; then
    ((DRY_RUN)) || { umask 077; : > "$ENV_FILE"; }
  elif ((DRY_RUN == 0)); then
    cp "$ENV_FILE" "$ENV_FILE.deploy-backup-$(date +%Y%m%d%H%M%S)"
  fi
  db_name="$(env_value POSTGRES_DB || true)"; db_name="${db_name:-viviora}"
  db_user="$(env_value POSTGRES_USER || true)"; db_user="${db_user:-viviora}"
  db_password="$(env_value POSTGRES_PASSWORD || true)"
  session_secret="$(env_value SESSION_SECRET || true)"
  [[ -n "$db_password" && "$db_password" != replace-with-* ]] || db_password="$(random_secret)"
  [[ -n "$session_secret" && "$session_secret" != replace-with-* ]] || session_secret="$(random_secret)$(random_secret)"
  if [[ "$MODE" == "host" ]]; then origin="https://$DOMAIN";
  elif [[ -n "$DOMAIN" ]]; then origin="http://$DOMAIN";
  else origin="http://localhost:$FRONTEND_PORT"; fi
  database_url="postgresql://${db_user}:${db_password}@vv-postgres:5432/${db_name}"
  if ((DRY_RUN)); then
    log "Would ensure .env with production settings (secrets omitted)."
    return
  fi
  set_env_value POSTGRES_DB "$db_name"
  set_env_value POSTGRES_USER "$db_user"
  set_env_value POSTGRES_PASSWORD "$db_password"
  set_env_value SESSION_SECRET "$session_secret"
  set_env_value DATABASE_URL "$database_url"
  set_env_value NODE_ENV production
  set_env_value FRONTEND_PORT "$FRONTEND_PORT"
  set_env_value BACKEND_PORT "$BACKEND_PORT"
  set_env_value POSTGRES_PORT "$POSTGRES_PORT"
  if [[ "$MODE" == "host" ]]; then set_env_value HOST_BIND_IP "127.0.0.1"; else set_env_value HOST_BIND_IP "0.0.0.0"; fi
  set_env_value FRONTEND_ORIGIN "$origin"
  chmod 600 "$ENV_FILE"
}

check_dns() {
  [[ "$MODE" == "host" ]] || return 0
  ((DRY_RUN)) && { log "Would verify DNS for $DOMAIN against this VPS public IP."; return 0; }
  command -v getent >/dev/null 2>&1 || die "getent is required for DNS validation."
  local resolved public_ip
  resolved="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 { print $1 }')"
  [[ -n "$resolved" ]] || die "DNS for $DOMAIN does not resolve to an IPv4 address."
  if command -v curl >/dev/null 2>&1; then
    public_ip="$(curl -4fsS --max-time 8 https://api.ipify.org || true)"
    [[ -z "$public_ip" || "$resolved" == "$public_ip" ]] || die "$DOMAIN resolves to $resolved, but this VPS public IP is $public_ip."
  else
    warn "curl is unavailable; skipped public IP comparison."
  fi
}

check_ports() {
  [[ "$MODE" == "host" ]] || return 0
  ((DRY_RUN)) && { log "Would check that ports 80 and 443 are available."; return 0; }
  command -v ss >/dev/null 2>&1 || return 0
  local port listener
  for port in 80 443; do
    listener="$(ss -ltnp "sport = :$port" 2>/dev/null || true)"
    if [[ -n "$listener" && "$listener" != *nginx* ]]; then
      die "Port $port is already used by a non-Nginx process."
    fi
  done
}

compose_args() {
  COMPOSE_ARGS=(-f "$COMPOSE_FILE")
  if [[ "$MODE" == "host" ]]; then
    COMPOSE_ARGS+=(-f "$DEPLOY_COMPOSE_FILE")
  fi
}

deploy_compose() {
  compose_args
  if ((SKIP_BUILD == 0)); then run docker compose "${COMPOSE_ARGS[@]}" build; fi
  run docker compose "${COMPOSE_ARGS[@]}" up -d
}

wait_for_backend() {
  ((DRY_RUN)) && { log "Would wait for backend health at 127.0.0.1:$BACKEND_PORT."; return; }
  command -v curl >/dev/null 2>&1 || die "curl is required for health checks."
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS --max-time 3 "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null; then return; fi
    sleep 2
  done
  docker compose "${COMPOSE_ARGS[@]}" logs --tail=80 vv-backend >&2 || true
  die "Backend health check timed out."
}

install_host_nginx() {
  ((DRY_RUN)) && { log "Would install/configure host Nginx for $DOMAIN."; return; }
  apt_install nginx
  local rendered="$NGINX_AVAILABLE.tmp"
  if [[ -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && -f "$NGINX_AVAILABLE" ]]; then
    log "Existing Nginx TLS config found for $DOMAIN; preserving it."
    ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
    return
  fi
  sed "s|DOMAIN|$DOMAIN|g" "$NGINX_TEMPLATE" > "$rendered"
  if [[ -f "$NGINX_AVAILABLE" ]]; then
    cp "$NGINX_AVAILABLE" "$NGINX_AVAILABLE.deploy-backup-$(date +%Y%m%d%H%M%S)"
  fi
  install -m 0644 "$rendered" "$NGINX_AVAILABLE"
  ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

configure_certbot() {
  ((SKIP_CERTBOT)) && { warn "Skipping Certbot by request; site is HTTP-only for now."; return; }
  ((DRY_RUN)) && { log "Would install Certbot, issue certificate for $DOMAIN and enable renewal."; return; }
  apt_install certbot python3-certbot-nginx
  if [[ ! -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    certbot --nginx -d "$DOMAIN" --email "$CERT_EMAIL" --agree-tos --no-eff-email --redirect
  else
    if grep -q 'ssl_certificate' "$NGINX_AVAILABLE" 2>/dev/null; then
      log "Certificate already exists for $DOMAIN; leaving existing TLS config intact."
    else
      certbot install --cert-name "$DOMAIN" --nginx --redirect
    fi
    certbot renew --dry-run
  fi
  systemctl enable --now certbot.timer 2>/dev/null || true
  certbot certificates | sed -n "/$DOMAIN/,+5p" || true
}

check_public_site() {
  ((DRY_RUN)) && return
  if [[ "$MODE" == "host" ]]; then
    local url="http://$DOMAIN/"
    ((SKIP_CERTBOT == 0)) && url="https://$DOMAIN/"
    curl -fsSIL --max-time 15 "$url" >/dev/null || warn "Could not verify $url yet; check DNS/firewall/Nginx logs."
  else
    curl -fsSIL --max-time 10 "http://127.0.0.1:$FRONTEND_PORT/" >/dev/null || die "Frontend health check failed."
  fi
}

main() {
  source_os
  prompt_values
  log "Mode: $MODE${DOMAIN:+ | domain: $DOMAIN}"
  check_dns
  check_ports
  ensure_docker
  if [[ "$MODE" == "host" ]]; then apt_install nginx; fi
  ensure_env
  deploy_compose
  wait_for_backend
  if [[ "$MODE" == "host" ]]; then
    install_host_nginx
    configure_certbot
  fi
  check_public_site
  log "Deployment completed."
  if [[ "$MODE" == "host" ]]; then
    if ((SKIP_CERTBOT)); then printf 'Site: http://%s\n' "$DOMAIN"; else printf 'Site: https://%s\n' "$DOMAIN"; fi
  else
    printf 'Site: http://127.0.0.1:%s (or the VPS IP on that port)\n' "$FRONTEND_PORT"
  fi
  printf 'API health: http://127.0.0.1:%s/api/health\n' "$BACKEND_PORT"
  printf 'Docker services: vv-postgres, vv-backend, vv-frontend\n'
  [[ "$MODE" == "host" && "$SKIP_CERTBOT" == 0 ]] && printf 'Certificate renewal: enabled\n'
}

main "$@"
