# Viviora VPS Deployment

Run this from the repository root after pulling code on Ubuntu/Debian:

```bash
sudo ./scripts/deploy.sh
```

The script supports `internal` mode (frontend container Nginx exposed on port 5080) and `host` mode (frontend container Nginx plus host Nginx with HTTPS). Host mode is the production default:

```bash
sudo ./scripts/deploy.sh --mode host --domain viviora.bcic.site --email admin@example.com
```

Before host mode, point the domain DNS A record to the VPS and allow ports 22, 80 and 443. The script installs Docker/Nginx/Certbot when needed, preserves `.env` secrets and database volumes, configures the host reverse proxy, issues a Let's Encrypt certificate and enables renewal.

Useful options:

```text
--mode internal|host
--domain DOMAIN
--email EMAIL
--skip-certbot
--skip-build
--dry-run
```

The script does not run `git pull`, reset the database or delete volumes. After deploy:

```bash
curl https://viviora.bcic.site/api/health
docker compose logs -f vv-backend
docker compose logs -f vv-frontend
sudo certbot renew --dry-run
```
