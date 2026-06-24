# OpenMediaVault Compose Deployment

This guide deploys Bio Project Management with the OpenMediaVault Compose plugin. It uses Docker Hub images, so the OMV server does not need Node.js, npm, or source builds.

## Images

```bash
docker pull siriuswang83/bio-project-management-backend:0.1.2
docker pull siriuswang83/bio-project-management-frontend:0.1.2
```

The compose file also uses PostgreSQL and Redis official images:

```bash
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

## Build And Push Images

Run these commands on a machine with Docker installed and Docker Hub login completed:

```bash
docker login

docker build -t siriuswang83/bio-project-management-backend:0.1.2 -t siriuswang83/bio-project-management-backend:latest ./backend
docker build -t siriuswang83/bio-project-management-frontend:0.1.2 -t siriuswang83/bio-project-management-frontend:latest ./frontend

docker push siriuswang83/bio-project-management-backend:0.1.2
docker push siriuswang83/bio-project-management-backend:latest
docker push siriuswang83/bio-project-management-frontend:0.1.2
docker push siriuswang83/bio-project-management-frontend:latest
```

## Build And Push With GitHub Actions

This repository also includes `.github/workflows/docker-hub.yml`.

1. Create a Docker Hub access token.
2. In GitHub, open `Settings` -> `Secrets and variables` -> `Actions`.
3. Add these repository secrets:

   ```text
   DOCKERHUB_USERNAME=siriuswang83
   DOCKERHUB_TOKEN=<dockerhub-access-token>
   ```

4. Open `Actions` -> `Publish Docker Hub Images`.
5. Click `Run workflow`.
6. Use version `0.1.2`.

After the workflow finishes, pull:

```bash
docker pull siriuswang83/bio-project-management-backend:0.1.2
docker pull siriuswang83/bio-project-management-frontend:0.1.2
```

## OMV Compose Plugin

1. In OpenMediaVault, install and enable the Compose plugin.
2. Create a new compose file.
3. Paste the content from `docker-compose.openmediavault.yml`.
4. Set environment variables in the compose plugin or in the `.env` field:

   ```env
   DOCKERHUB_NAMESPACE=siriuswang83
   APP_VERSION=0.1.2
   POSTGRES_DB=bio_pm
   POSTGRES_USER=bio_pm
   POSTGRES_PASSWORD=replace_with_a_strong_password
   JWT_SECRET=replace_with_a_long_random_secret
   ADMIN_EMAIL=admin@bio.local
   ADMIN_PASSWORD=replace_with_a_strong_admin_password
   FRONTEND_PORT=5173
   BACKEND_PORT=3333
   POSTGRES_PORT=5432
   REDIS_PORT=6379
   DATABASE_SYNCHRONIZE=true
   REDIS_ENABLED=true
   ```

5. Deploy the stack.
6. Open `http://OMV_SERVER_IP:5173`.

Backend API is exposed on `http://OMV_SERVER_IP:3333/api`.

## Data Volumes

The compose file creates these named volumes:

- `bio_pm_postgres_data`: PostgreSQL data
- `bio_pm_redis_data`: Redis append-only data
- `bio_pm_uploads`: uploaded images and attachments

Back up PostgreSQL and `bio_pm_uploads` before upgrading.

## First Login

Use the values configured in environment variables:

- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

Change the default administrator password and `JWT_SECRET` before production use.
