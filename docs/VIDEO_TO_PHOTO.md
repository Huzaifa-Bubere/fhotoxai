# Video-to-Photo Extraction with Face-Based Grouping

A photographer can upload an **event video**, extract useful **full-frame
photographs** at a chosen interval, preview them, and import the selected
frames into the existing event gallery. Face grouping stays where it
already lives: the **organizer** decides when to start re-clustering.

---

## 1. Workflow

```
Select event → Upload video → Configure extraction → (background) extract
→ Preview frames → Select → Import into event gallery → Organizer runs
the existing clustering workflow for People.
```

The feature lives in the **event workspace** (`/photographer/event/:eventId`)
under the **Videos** tab:

1. **Upload** — drag-and-drop (or browse) an MP4/MOV/WebM video. Upload
   limits are displayed *before* the upload and enforced server-side.
2. **Configure** — interval (0.5 / 1 / 2 / 5 s), optional start/end time
   range, optional blur filter, near-duplicate filter and "keep frames
   with faces only".
3. **Process** — a bounded background worker extracts frames with FFmpeg
   and analyzes them (quality / duplicates / faces). Upload progress and
   processing progress are shown **separately and only from real work**.
4. **Preview & select** — a paginated frame grid with timestamp badges,
   selection controls and a lightbox showing source video + timestamp.
5. **Import** — selected frames are inserted into `photos` as ordinary
   event photos with provenance (`source_video_id`, `source_timestamp_ms`).
   The event's *Photos* tab gains filters: **All / Uploaded / Video-extracted**.
6. **People** — the People tab shows backend-derived stats and explains
   that clustering is started by the **organizer** through the existing
   workflow (`/photo-clustering`). Extraction/import never touches
   clusters.

> **Sampling caveat (shown in the UI):** coarse interval sampling and the
> filters can miss brief appearances. Retry a job with a shorter interval
> or with filters disabled.

Coarse-scene-change extraction is **deferred** (see §9).

---

## 2. Architecture

```
frontend (React 19 + Vite)
  src/utils/videoApi.js  •  src/components/workspace/{VideoWorkflow,PhotosTab}.jsx
        │  fetch (session cookie) via /api proxy
        ▼
backend/general_api/  (FastAPI, port 3001)
  routers/videos.py          endpoints (auth + event access checked)
  services/video_config.py   env-tunable limits
  services/video_ffmpeg.py   ffprobe metadata + ffmpeg frame extraction
  services/video_frame_analysis.py  blur / aHash dedup / quality / faces
  services/video_store.py    persistence (+ transactional import)
  services/video_worker.py   bounded background worker (threads, 1 job)
        │
        ▼
PostgreSQL (pgvector)      frames/jobs/videos/provenance tables
filesystem                 uploads/…/videos/<uuid>.mp4 (source)
                           downloads/video_jobs/job_<id>/frames (previews)
```

**Storage note** — imported photos follow the *existing* photo ingestion
path: S3 first (when credentials exist), local `uploads/event_<id>/…`
fallback otherwise, the same as `POST /photos/upload-folder`. Frame
previews deliberately stay **outside** the public `/uploads` mount and
are served through the access-checked
`GET /videos/frames/{id}/file` endpoint.

---

## 3. API contract (all session-authenticated)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/videos/limits` | organizer, photographer | client-safe limits to display |
| POST | `/videos/events/{event_id}/upload` | organizer, photographer | multipart; streams to disk (1 MiB chunks); validates with ffprobe; returns `202 {job_id, video_id, video}` |
| GET | `/videos/events/{event_id}/jobs` | organizer, photographer | job history incl. video metadata |
| GET | `/videos/jobs/{job_id}` | organizer, photographer | status, stage, progress %, counters, actionable error, status_counts |
| GET | `/videos/jobs/{job_id}/frames?frame_status=preview&page=1&page_size=24` | organizer, photographer | paginated previews with `preview_url`, timestamps, quality |
| GET | `/videos/frames/{frame_id}/file` | organizer, photographer | access-checked preview image (frames never public) |
| POST | `/videos/jobs/{job_id}/import` | organizer, photographer | form `frame_ids` list; transactional, idempotent |
| POST | `/videos/jobs/{job_id}/cancel` | owner (or admin) | terminates worker, cleans temp |
| POST | `/videos/jobs/{job_id}/retry` | owner (or admin) | re-queue failed/cancelled for a clean fresh pass |
| DELETE | `/videos/jobs/{job_id}` | owner (or admin) | job + temp frames + source video |

Also: `GET /photos/source?event_id=&source=all|uploaded|video` for the
gallery source filters with backend-derived counts.

**Identity is derived from the session cookie** (`SessionAuthMiddleware`);
event membership and role enforcement reuse the existing
`assert_event_access` helper on every endpoint. When the event's uploads
are finalized (`photos_upload_complete`), upload / import / delete are
rejected with **409** on the backend *and* disabled in the UI.

---

## 4. Processing stages & progress

| Stage | What happens | Progress basis |
|---|---|---|
| `probe` (0–4%) | ffprobe decodes metadata: container, codec, duration, size, rotation, fps | — |
| `extract` (4–12%) | ffmpeg samples the decoded presentation timeline (`-ss <start>` accurate seek → `fps=1/<interval>`); per-frame source timestamps come from the `showinfo` log (`pts_time`), so **VFR input and portrait rotation are handled without assuming `frame_index / fps`** | frames written by ffmpeg vs expected |
| `analyze` (12–96%) | per frame: Laplacian-variance blur heuristic, 64-bit aHash with a **bounded sliding window** (last 40 accepted) for near-duplicates, composite quality score, optional face filter via the shared InsightFace/FaceNet service | frames analyzed vs total |
| `ready` (96–100%) | job marked completed; counters persisted | — |

Counters reported on the job:
`candidate_frames`, `rejected_blur`, `rejected_duplicates`,
`rejected_faces`, `preview_frames`, `imported_photos` — each kept
separate so the UI can explain *why* frames disappeared.

---

## 5. Configuration (environment variables)

All optional; defaults shown. Set on the `general-api` service.

| Variable | Default | Meaning |
|---|---|---|
| `VIDEO_MAX_UPLOAD_MB` | `250` | max upload size |
| `VIDEO_MAX_DURATION_SEC` | `300` | max video duration (5 min) |
| `VIDEO_MAX_CANDIDATE_FRAMES` | `300` | max frames extracted per job |
| `VIDEO_MAX_FRAME_SIDE_PX` | `2160` | max long-side resolution |
| `VIDEO_ALLOWED_INTERVALS` | `0.25,0.5,1,2,5` | choices offered |
| `VIDEO_DEFAULT_INTERVAL_SEC` | `1` | default interval |
| `VIDEO_BLUR_LAPLACIAN_MIN` | `30` | blur threshold (heuristic) |
| `VIDEO_DUP_HAMMING_MAX` | `6` | aHash Hamming distance threshold |
| `VIDEO_DUP_WINDOW` | `40` | bounded comparison window |
| `VIDEO_MAX_CONCURRENT_JOBS` | `1` | worker parallelism |
| `VIDEO_WORKER_ENABLED` | `1` | `0` disables the worker |
| `VIDEO_FFMPEG_TIMEOUT_SEC` | `900` | hard ffmpeg timeout |
| `FFMPEG_BIN` / `FFPROBE_BIN` | PATH lookup | explicit binary override |

These are **application policy limits**, not claims about FFmpeg.

---

## 6. Safety, failure & recovery behaviour

- Uploads stream to disk in fixed chunks — never fully in RAM.
- Media content is validated with `ffprobe` (corrupt files, missing
  video streams, audio-only stills rejected with actionable 4xx errors).
- ffmpeg is invoked with an **argument array (no shell)**, path-safe
  server-generated filenames, hard process timeouts, and termination on
  cancellation and on timeout.
- **Cancellation:** sets job status `cancelled`; every ffmpeg run polls
  this and self-terminates. Temp frame files are removed; the source
  video is kept, so `Retry` re-extracts cleanly.
- **Failure:** jobs end `failed` with an actionable message (visible in
  the job card). Retry re-queues from scratch (frame rows and counters
  are reset; the `(job_id, timestamp_ms)` unique index prevents residual
  duplicates).
- **Restart policy:** a server restart cannot resume a mid-decode
  subprocess, so interrupted jobs are **explicitly marked
  failed-retryable** at startup with the message "Processing was
  interrupted by a server restart…" — they never stay stuck in
  `processing`. Partial temp files are cleaned automatically.
- **Duplicate-import prevention:** the import runs **inside one DB
  transaction** with `SELECT … FOR UPDATE` on the selected frame rows;
  each frame transitions `preview → imported` exactly once and records
  `imported_photo_id`, so repeated requests skip instead of duplicating.
- No attendee notifications are sent during extraction previews or
  failures.
- Cleanup: `DELETE /videos/jobs/{id}` removes temp frames, the frame
  rows, the job row and the source video (and its directory).

---

## 7. Installation

### Docker (recommended)
The `general-api` image installs `ffmpeg` + `ffprobe` and starts the
worker:

```cmd
docker compose up -d db
docker compose up -d general-api ai-api
docker compose logs -f general-api
```

### Windows (Command Prompt, local CPU — no AWS needed)
```bat
cd "C:\Huzaifa Degree\Final Year Project\fhotoxai\backend"
python -m pip install -r requirements.txt
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=postgres
set DB_NAME=digitalnexusai_emc_db
REM binaries: install FFmpeg and add to PATH, or point at them here:
set FFMPEG_BIN=C:\path\to\ffmpeg.exe
set FFPROBE_BIN=C:\path\to\ffprobe.exe
python -m uvicorn general_api.main:app --host 0.0.0.0 --port 3001
```

### Migrations against an existing database (no data loss)
```bat
cd "C:\Huzaifa Degree\Final Year Project\fhotoxai\backend"
python scripts\apply_migrations.py --status
python scripts\apply_migrations.py
```
- Idempotent (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`);
  safe to re-run.
- Progress is tracked in `schema_migrations` so databases that predate
  the feature (Docker only initializes SQL into fresh volumes) still
  receive it on the next API start (`_apply_versioned_migrations` in
  `general_api/main.py`) without deleting data.

### Frontend
```bat
cd frontend
npm install
npm run dev
```

### Models (only for the optional "faces only" filter)
The shared face service loads InsightFace `buffalo_l` (FaceNet fallback)
lazily and locally on CPU — the same models used by the existing
clustering pipeline; **no new model is introduced**. First run downloads
weights to the InsightFace cache. Without models, the *faces-only*
filter is disabled in the UI (the upload endpoint rejects it with a
clear 422); blur/duplicate filters still work model-free.

---

## 8. Verification summary

Backend (`cd backend && python -m pytest tests -v`, requires
ffmpeg/ffprobe; logic tests pass without them — media tests auto-skip):

- ✅ 39/39 passing locally (CPU, Windows) incl. real extraction:
  timestamps, portrait, VFR, short-clip, corrupt input, rotation parsing,
  blur/dup heuristics, bounded dedup window, settings overrides.
- DB-gated integration (upload → permissions → cancellation → duplicate
  import) requires a running DB via `VIDEO_DB_TESTS=1`; they were
  exercised as a live smoke run instead (see §10).

Frontend: `npm run build` ✅ · `npm run lint` — 0 errors in changed
files; one pre-existing error in untouched `vite.config.js`
(`process` undefined — environment config issue in the repo baseline).

Migrations verified against both a fresh tracking state and a populated
database (rows intact, re-running is a no-op).

## 9. Current limitations

- **Scene-change extraction is deferred.** Interval sampling covers the
  core workflow; scene detection would land as a second extraction type
  (`extraction_type`) after review feedback.
- Face detection needs its model files; the *faces-only* filter fails
  fast with guidance when they are missing rather than silently
  discarding everything.
- Blur score and perceptual-hash similarity are **heuristics**;
  thresholds are configurable but not adaptive.
- Duplicate detection only removes *near-identical* frames; two distinct
  shots of the same person are never collapsed (identity similarity
  belongs to clustering, and face-embedding similarity is deliberately
  NOT used to discard photos).
- Frame previews are local-storage only; S3 is used only for *imported*
  photos (matching the existing photo path).
- The redesign currently covers the **event workspace** (event header +
  Photos/Videos/People tabs, gallery with source filters, video
  workflow) and wires the shared tokens (`styles/workspace.css`) into
  `dashboard-theme.css` so dashboards can adopt them; the full pass over
  every landing/auth page with the new visual language is future work.

## 10. Short review demonstration (2 minutes)

1. Start the stack (§7); open `http://localhost:5173` → photographer →
   open an event.
2. Show the redesigned workspace: header with status *Open for
   uploads*, `Photos / Videos / People` tabs, gallery source-filter
   chips with server-derived counts.
3. Videos tab: note pre-upload limits shown in the info banner. Upload a
   short MP4 (drag-and-drop). Show the *transferring* bar stop at 100%
   and the separate *processing* bar reflect stage + real frame counts.
4. When the job completes, open the counters row (candidates, blur,
   duplicates, previews, imported) then **Preview frames** → click
   timestamps, select 3–5 frames, **Import selected**.
5. Switch to **Photos** tab → *Video-extracted* filter shows the
   imported photos; click one, the preview modal shows "Extracted from
   video #N at 0:12".
6. People tab: point out the note that clustering is started by the
   organizer (existing workflow unchanged), then run the same clustering
   endpoint to demonstrate new photos flow into the existing pipeline.
7. Failure paths to demo if desired: upload a corrupt file (422 with a
   readable message); cancel a long extraction (job → cancelled,
   assets cleaned, *Retry* re-queues); refresh mid-processing to show
   job progress is restored from the DB.
