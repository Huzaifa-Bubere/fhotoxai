# Project guidance

## Project layout

- `frontend/` contains the React application, built and served with Vite.
- `backend/general_api/` contains the main FastAPI service (port 3001 in the container).
- `backend/ai_api/` contains the image processing FastAPI service (port 5001).
- `docker-compose.yml` defines PostgreSQL with pgvector and both API services.
- `compose.override.yaml` provides local development settings used automatically by Docker Compose.

## Running locally

Start the database and backend services from the repository root:

```powershell
docker compose up -d db general-api ai-api
```

Start the frontend in another PowerShell window:

```powershell
cd frontend
npm.cmd run dev -- --host 0.0.0.0
```

The frontend is available at `http://localhost:5173/`. The Vite development server proxies `/api` to the general API and `/ai-api` to the AI API; both backend services and the database must be running for backend-dependent features.

## Implementation notes

- Keep frontend API proxy paths and targets in `frontend/vite.config.js` and `frontend/.env.local` aligned.
- The Compose setup maps the general API to host port `3002`, the AI API to `5001`, and PostgreSQL to `5432`.
- Follow existing patterns and configuration in the relevant frontend or backend service when making changes.
- Do not commit credentials, local environment files, uploaded media, or generated build artifacts.
