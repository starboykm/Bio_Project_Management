# Bio Project Management

English | [中文说明](README.zh-CN.md)

Bio Project Management is a modular project management, knowledge base, CRM, form, notification, and reporting platform for bio-organic fertilizer companies. The first release focuses on single-company internal operations, username/password login, role-based permissions, project-task collaboration, local attachments, and multiple deployment options.

## Features

- Slack-style workspace UI built with Vue 3, Element Plus, and Vite.
- Account/password authentication with JWT, user profiles, avatars, language preferences, roles, and direct user permissions.
- Admin console for users, roles, permissions, translation dictionary, tags, and form management.
- Project management with owners, participants, comments, notes, approvals, task-linked progress calculation, and in-app mention notifications.
- Task management with personal task views, all-task views, project synchronization, status updates, progress notes, and second-confirm deletion.
- In-app notifications and communication threads with unread counts, read state, mentions, `@all`, and `Ctrl + Enter` quick reply.
- Knowledge base with folder-style categories, tags, permissions, rich-text editing, Markdown interoperability, images, and attachments.
- Dynamic form module that can design reusable forms, publish fields to reports or dashboards, and power the CRM module.
- CRM records driven by the first built-in CRM form, including customer details, tracking users, follow-up content, and detail views.
- Global search across projects, tasks, knowledge articles, and CRM customers.
- PostgreSQL and Redis production architecture, with a SQL.js standalone mode for direct server debugging and demos.

## Architecture

```text
Frontend: Vue 3 + Element Plus + Vite
  - Routes: /dashboard, /project, /task, /knowledge, /crm, /report, /admin
  - Workspace shell, kanban/list views, forms, charts, i18n dictionary, global search

Backend: Node.js + NestJS REST API
  - Modules: Auth, User, Role, Translation, Project, Task, Notification,
             Communication, Knowledge, Form, CRM, Report, Search
  - Services: permission checks, mention parsing, notification dispatch,
              file upload, scheduled-ready data model

Data layer:
  - PostgreSQL: users, roles, projects, tasks, knowledge, CRM, forms, reports
  - Redis: cache/session/queue-ready service layer
  - SQL.js: local standalone debug database
  - Local filesystem: uploads and attachments
```

## Repository Layout

```text
backend/              NestJS API service
frontend/             Vue 3 workspace UI and nginx config
infra/postgres/       PostgreSQL initialization files
scripts/              Windows standalone start/stop scripts
docs/                 Architecture and deployment notes
docker-compose.yml    PostgreSQL, Redis, backend, and frontend stack
```

## Quick Start

```powershell
npm.cmd install
npm.cmd run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

Default first admin account:

- Email: `admin@bio.local`
- Password: `Admin123456`

Change `JWT_SECRET` and the default admin password before production use.

## Server Deployment

This mode runs directly on a Windows or Linux server without Docker. Use it for debugging, demonstrations, or small internal deployments.

### Option A: Standalone Debug Mode

Standalone mode uses SQL.js and local files, so it does not require PostgreSQL or Redis.

```powershell
Copy-Item .env.standalone.example .env.standalone
powershell -ExecutionPolicy Bypass -File .\scripts\start-standalone.ps1
```

Open `http://127.0.0.1:5173/`.

Stop the services:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-standalone.ps1
```

Standalone data paths:

- Database: `data/standalone.sqlite`
- Uploads: `uploads/`
- Logs: `logs/`

### Option B: Host Services Mode

Use this mode when PostgreSQL and Redis are installed on the server.

1. Install Node.js 22 LTS or newer, PostgreSQL 16+, Redis 7+, and npm.
2. Create the database and user:

   ```sql
   CREATE DATABASE bio_pm;
   CREATE USER bio_pm WITH PASSWORD 'replace_with_a_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE bio_pm TO bio_pm;
   ```

3. Copy and edit environment variables:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Install dependencies and build:

   ```powershell
   npm.cmd install
   npm.cmd run build
   ```

5. Start the backend:

   ```powershell
   npm.cmd --workspace backend run start
   ```

6. Serve `frontend/dist` with nginx, Caddy, IIS, or another static server, and proxy `/api` to `http://127.0.0.1:3000/api`.

Recommended production settings:

- Use a strong `JWT_SECRET`.
- Set strong PostgreSQL and Redis passwords.
- Back up PostgreSQL and the upload directory.
- Put the frontend behind HTTPS.
- Store uploads on persistent disk or object storage.

## Docker Deployment

### Docker Direct Deployment

Use this when you want to run containers manually instead of Docker Compose.

Create a Docker network:

```bash
docker network create bio-pm-net
```

Start PostgreSQL:

```bash
docker run -d --name bio-pm-postgres --network bio-pm-net \
  -e POSTGRES_DB=bio_pm \
  -e POSTGRES_USER=bio_pm \
  -e POSTGRES_PASSWORD=bio_pm_password \
  -v bio_pm_postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

Start Redis:

```bash
docker run -d --name bio-pm-redis --network bio-pm-net \
  -p 6379:6379 \
  redis:7-alpine
```

Build and run the backend:

```bash
docker build -t bio-pm-backend ./backend
docker run -d --name bio-pm-backend --network bio-pm-net \
  --env-file .env \
  -e DATABASE_HOST=bio-pm-postgres \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=bio_pm \
  -e DATABASE_PASSWORD=bio_pm_password \
  -e DATABASE_NAME=bio_pm \
  -e REDIS_HOST=bio-pm-redis \
  -e REDIS_PORT=6379 \
  -v bio_pm_uploads:/app/uploads \
  -p 3000:3000 \
  bio-pm-backend
```

Build and run the frontend:

```bash
docker build -t bio-pm-frontend ./frontend
docker run -d --name bio-pm-frontend --network bio-pm-net \
  -p 5173:80 \
  bio-pm-frontend
```

Open `http://localhost:5173`.

### Docker Compose Deployment

Docker Compose is the recommended container deployment path.

```bash
cp .env.example .env
docker compose up -d --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop the stack:

```bash
docker compose down
```

Stop and remove persistent volumes:

```bash
docker compose down -v
```

## Release

The first release is tagged as `v0.1.0`.

See [Release Notes](docs/RELEASE_NOTES_v0.1.0.md).
