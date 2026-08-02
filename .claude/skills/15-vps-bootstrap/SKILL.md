---
name: vps-bootstrap
description: Prepares VPS 89.207.254.215 for a safe isolated COMPNET Docker deployment.
---

# VPS Bootstrap for COMPNET

Use for the first deployment or when validating server readiness.

## Target

```text
Host: 89.207.254.215
Directory: /var/www/compnet
```

Read SSH user and port from GitHub Secrets or user confirmation. Never assume port 22.

## Read-only discovery first

After SSH login, run:

```bash
hostname
whoami
pwd
lsb_release -a 2>/dev/null || cat /etc/os-release
sudo ss -tulpn
sudo ufw status numbered
docker --version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker network ls
docker volume ls
sudo nginx -T 2>/dev/null | sed -n '1,260p'
```

Summarize existing sites and port conflicts before making changes.

## Directory setup

```bash
sudo mkdir -p /var/www/compnet
sudo chown -R "$USER":"$USER" /var/www/compnet
chmod 750 /var/www/compnet
```

## Production `.env`

Create only on the VPS:

```env
DOCKERHUB_USERNAME=<docker-hub-user>
POSTGRES_DB=compnet_db
POSTGRES_USER=compnet_user
POSTGRES_PASSWORD=<strong-random-password>
```

Generate a password locally on the VPS:

```bash
openssl rand -base64 36
```

Then:

```bash
chmod 600 /var/www/compnet/.env
```

Do not display its full contents in logs or screenshots.

## Docker access

Check:

```bash
docker ps
```

If permission is denied:

```bash
sudo usermod -aG docker "$USER"
```

Then require a new login session before continuing.

## Initial compose upload

From the local repository root:

```bash
scp -P <VPS_PORT> docker-compose.prod.yml \
  <VPS_USER>@89.207.254.215:/var/www/compnet/
```

Validate remotely:

```bash
cd /var/www/compnet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml config
```

## Firewall policy

For final production with Nginx:

- allow current SSH port;
- allow 80/tcp;
- allow 443/tcp;
- do not expose 5432;
- bind app ports to `127.0.0.1` in Compose.

Do not remove the currently working SSH rule until a second SSH session proves the new rule works.

## Existing PostgreSQL data

Before any operation that might replace or migrate the database:

```bash
mkdir -p /var/www/compnet/backups
docker exec compnet-postgres pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/var/www/compnet/backups/compnet-$(date +%F-%H%M%S).dump"
```

Adapt environment access safely. Never delete the database volume as part of normal deployment.
