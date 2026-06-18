# Deployment

## Local npm

```bash
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

## Docker Compose

```bash
copy .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Production Notes

- Set `DATABASE_SYNCHRONIZE=false` after formal migrations are introduced.
- Replace local uploads with MinIO or S3 when attachment scale grows.
- Use a managed PostgreSQL backup policy before importing production data.
- Rotate `JWT_SECRET` and change `ADMIN_PASSWORD` before first production login.
- Put the frontend behind HTTPS and proxy `/api` to the backend service.

## Standalone Server Debug

```powershell
Copy-Item .env.standalone.example .env.standalone
powershell -ExecutionPolicy Bypass -File .\scripts\start-standalone.ps1
```

Standalone mode uses `sqljs`, `data/standalone.sqlite`, local uploads, and local logs. Use PostgreSQL and Redis for production.
