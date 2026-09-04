# Commands And Login Guide

## Project Root

```powershell
cd C:\photo-clustering\ai-vision-architecture
```

## Backend Commands

### 1. Activate virtual environment

```powershell
.venv\Scripts\Activate.ps1
```

### 2. Install backend dependencies

```powershell
python -m pip install -r backend\requirements.txt
```

### 3. Run General API

```powershell
cd backend
python -m uvicorn general_api.main:app --host 0.0.0.0 --port 3001
```

General API URL:

```text
http://127.0.0.1:3001
```

### 4. Run AI API

Open a second terminal:

```powershell
cd C:\photo-clustering\ai-vision-architecture
.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn ai_api.main:app --host 0.0.0.0 --port 5001
```

AI API URL:

```text
http://127.0.0.1:5001
```

### 5. Optional bash helper

If you are using Git Bash / Linux shell, the repo also has:

```bash
cd backend
./start.sh
```

## Frontend Commands

### 1. Install frontend dependencies

```powershell
cd C:\photo-clustering\ai-vision-architecture\frontend
npm install
```

### 2. Run frontend

```powershell
cd C:\photo-clustering\ai-vision-architecture\frontend
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 3. Build frontend

```powershell
cd C:\photo-clustering\ai-vision-architecture\frontend
npm run build
```

## Main URLs

```text
Frontend:           http://localhost:5173
General API:        http://127.0.0.1:3001
AI API:             http://127.0.0.1:5001
Organizer Login:    http://localhost:5173/organizer/login
Organizer Register: http://localhost:5173/organizer/register
Photographer Login: http://localhost:5173/photographer/login
Photographer Register: http://localhost:5173/photographer/register
Attendee Login:     http://localhost:5173/attendee/login
Attendee Register:  http://localhost:5173/attendee-registration
```

## Login Credentials

### Organizer

Current live database account found on this machine:

```text
Email: test@test.com
Role: organizer
Status: active
Password: test123
```

Working organizer login options:

1. Use an existing organizer account if you already know its password.
2. Create a new organizer from:

```text
http://localhost:5173/organizer/register
```

Then log in with the same email and password at:

```text
http://localhost:5173/organizer/login
```

### Photographer

There is no fixed hardcoded photographer password in the current code.

Create a photographer account from:

```text
http://localhost:5173/photographer/register
```

Then log in with the same email and password at:

```text
http://localhost:5173/photographer/login
```

### Attendee

Attendees do not use a fixed password.

Flow:

1. Register as attendee from:

```text
http://localhost:5173/attendee-registration
```

2. Login from:

```text
http://localhost:5173/attendee/login
```

3. Use email + OTP.

Dev note:

If email sending fails, backend `/auth/send-otp` returns an `otp_hint` in demo mode.

## Useful API Login Endpoints

```text
POST /auth/register
POST /auth/login
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/verify-attendee
```

## Recommended Startup Order

1. Start PostgreSQL / database first.
2. Start General API on port `3001`.
3. Start AI API on port `5001`.
4. Start frontend on port `5173`.
5. Open frontend login page and sign in.
