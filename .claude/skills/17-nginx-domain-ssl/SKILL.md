---
name: nginx-domain-ssl
description: Adds COMPNET domains and HTTPS through system Nginx without disrupting existing VPS sites.
---

# Nginx, Domain, and SSL for COMPNET

Use only after the frontend and backend respond on VPS loopback ports.

## Safety first

Before editing:

```bash
sudo nginx -T > /tmp/nginx-before-compnet.txt
sudo cp -a /etc/nginx /etc/nginx.backup-$(date +%F-%H%M%S)
sudo ss -tulpn | grep -E ':80|:443|:3000|:8080'
```

Inspect all existing `server_name` values. Do not overwrite another project's config.

## Required information

Confirm the production domain names before creating the config. Do not invent them.

Recommended architecture:

- main domain → `127.0.0.1:3000`
- optional `www` → redirect to canonical domain
- API subdomain → `127.0.0.1:8080`

## Frontend Nginx server

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## API Nginx server

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Installation procedure

Create a unique file:

```text
/etc/nginx/sites-available/compnet.conf
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/compnet.conf \
  /etc/nginx/sites-enabled/compnet.conf
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` fails, do not reload. Restore or correct only the COMPNET file.

## TLS

After DNS A records point to `89.207.254.215` and HTTP works:

```bash
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com
sudo certbot renew --dry-run
```

Use only confirmed domains.

## Final checks

```bash
curl -I http://example.com
curl -I https://example.com
curl -fsS https://api.example.com/health
sudo nginx -t
sudo systemctl status nginx --no-pager
```

After Nginx is active, app ports should remain bound to `127.0.0.1`, not publicly exposed.
