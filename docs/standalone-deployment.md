# Standalone Deployment

This mode runs the system directly on a Windows server without Docker, PostgreSQL, or Redis. It is intended for debugging and demos.

## Start

```powershell
Copy-Item .env.standalone.example .env.standalone
powershell -ExecutionPolicy Bypass -File .\scripts\start-standalone.ps1
```

Open:

- Frontend: `http://127.0.0.1:5173/`
- Backend API: `http://127.0.0.1:3333/api`

Default login:

- `admin@bio.local`
- `Admin123456`

## Stop

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-standalone.ps1
```

## Data

- Database file: `data/standalone.sqlite`
- Uploads: `uploads/`
- Logs: `logs/`

## Production Note

Standalone mode uses `sqljs` and in-memory sessions. For production, keep the Docker or host-service architecture with PostgreSQL and Redis.
