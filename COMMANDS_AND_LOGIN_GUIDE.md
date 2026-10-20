# Local Run and Login Guide

## Start the full project

The project uses Docker Compose for PostgreSQL and both backend APIs. Start Docker Desktop first and wait until its engine is running.

In PowerShell, start the database and APIs from the project root:

```powershell
cd "C:\Huzaifa Degree\Final Year Project\fhotoxai"
docker compose up --build -d
docker compose ps
```

The first startup downloads and builds the service images and can take several minutes. Wait until `db`, `general-api`, and `ai-api` show as running. Compose reads `compose.override.yaml` automatically for local settings.

Open a second PowerShell window and start the frontend:

```powershell
cd "C:\Huzaifa Degree\Final Year Project\fhotoxai\frontend"
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```

Open the frontend at <http://localhost:5173/>. Keep both PowerShell windows open while using the app.

| Service | Local address |
| --- | --- |
| Frontend | <http://localhost:5173/> |
| General API | <http://localhost:3002/> |
| AI API | <http://localhost:5001/> |
| PostgreSQL | `localhost:5432` |

The Vite frontend proxies `/api` to the general API and `/ai-api` to the AI API. The API and database services must be running for login, event, upload, and gallery features.

To stop the backend services, run this from the project root:

```powershell
docker compose down
```

This keeps the local database volume. Avoid `docker compose down -v` if you need to preserve its data.

## Login details

### Organizer

The existing local demo account documented for this machine is:

```text
Email: test@test.com
Password: test123
Login: http://localhost:5173/organizer/login
```

If this account is not present in a freshly initialized database, create an organizer at <http://localhost:5173/organizer/register>, then sign in with that account.

### Photographer

There is no fixed photographer demo password. Create an account at <http://localhost:5173/photographer/register>, then use the same email and password at <http://localhost:5173/photographer/login>.

### Attendee

Attendees use email verification rather than a fixed demo password. Register at <http://localhost:5173/attendee-registration> and continue through <http://localhost:5173/attendee/access>. In local demo mode, if email delivery is unavailable, the API may return an `otp_hint` for testing.

## Troubleshooting

- If Compose reports that it cannot connect to the Docker API, open Docker Desktop and wait for the engine to finish starting, then retry `docker compose up --build -d`.
- If a frontend request fails, check service status with `docker compose ps` and API logs with `docker compose logs general-api ai-api`.
- If port 5173 is already in use, stop the other Vite process or use the alternate URL printed by Vite.
