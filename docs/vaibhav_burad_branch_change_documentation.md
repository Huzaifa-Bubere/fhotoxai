# `vaibhav-burad ' Documentation

## Scope

This document covers only the committed work on the `vaibhav-burad` branch from the first branch-only commit through the latest committed change on the branch.

- Branch: `vaibhav-burad`
- Base commit used for comparison: `6947124f8f15a998e1aee62c36a5392d09461c3f`
- First branch-only commit: `f6150cd9e5261aca503242c3df717b70ba5f5049`
- Last committed branch change: `fe3a52f05f26f63c831cdc673916404c534f9ff1`
- Commit window: March 16, 2026 to March 31, 2026
- Net branch diff: 77 files changed, 11,876 insertions, 3,570 deletions

This write-up intentionally excludes:

- commits from `main`, `Architecture`, or any other branch
- uncommitted local changes currently present in the working tree

---

## Branch Intent

The `vaibhav-burad` branch is primarily a quality and product-maturity branch. Across this range of commits, the work moved in three directions at the same time:

1. It improved the ML face-clustering pipeline so it is more stable, scalable, and less likely to create noisy or incorrect clusters.
2. It improved the product experience around those ML results by adding better attendee flows, organizer visibility, highlight reels, and cleaner dashboards.
3. It improved engineering quality with better logging, stronger auth boundaries, better operational documentation, and cleaner repository hygiene.

In simple terms, this branch did not just "add features". It made the system easier to trust, easier to operate, and easier for end users to benefit from the ML output.

---

## Commit Timeline

| Date | Commit | Message |
| --- | --- | --- |
| 2026-03-16 | `f6150cd` | Improve clustering pipeline consistency and scalability |
| 2026-03-16 | `b7705ad` | Improve clustering pipeline consistency and scalability |
| 2026-03-17 | `3e3a46f` | 12 bugs fixed in backend and ML and file add what has change |
| 2026-03-23 | `fd7554d` | logig has improved |
| 2026-03-29 | `d8c83dd` | feat: Add highlight reel feature for events and attendees |
| 2026-03-29 | `dea7499` | fix: narrow optional seed labels in clustering service |
| 2026-03-29 | `1f2bdde` | fix: ignore local face data and track model artifact |
| 2026-03-29 | `93f7f90` | Remove outdated testing documentation and project README |
| 2026-03-30 | `91969f4` | Improve face clustering pipeline and restore missing notification scripts |
| 2026-03-30 | `8370cfa` | fix: improve face clustering and filter cartoon false positives |
| 2026-03-31 | `fe3a52f` | ui improve |

---

## Detailed Change Documentation

### 1. `f6150cd9e5261aca503242c3df717b70ba5f5049`
**Title:** Improve clustering pipeline consistency and scalability  
**Date:** March 16, 2026

**What changed**

- Refactored the ML clustering flow in `backend/ai_api/services/clustering_service.py`.
- Reworked training orchestration in `backend/ai_api/services/training_service.py`.
- Focused on making clustering behavior more consistent when many faces are processed in one event.

**Why this change should be there**

- A face-clustering product is only useful if the same person is grouped reliably across different photos, angles, and lighting conditions.
- Early-stage clustering pipelines often work on small samples but become unstable when event volume grows.
- This commit created the first strong foundation for scaling the pipeline beyond a demo-quality implementation.

**How it improves product quality and the ML pipeline**

- Reduces cluster instability between runs.
- Makes the training pipeline more predictable when processing large batches of embeddings.
- Establishes a cleaner base for later fixes such as real confidence scoring, attendee matching, and false-positive filtering.

---

### 2. `b7705adcf193d57a661d809bd89dbaf4576dde24`
**Title:** Improve clustering pipeline consistency and scalability  
**Date:** March 16, 2026

**What changed**

- Extended the earlier ML pipeline work into service configuration, database access, app startup, and notification flow.
- Updated AI service files such as `backend/ai_api/config.py`, `backend/ai_api/database.py`, `backend/ai_api/main.py`, and `backend/ai_api/services/notification_service.py`.
- Updated frontend clustering and dashboard files including `FaceThumbnail.jsx`, `AttendeeDashboard.jsx`, `OrganizerDashboard.jsx`, and `photoClusteringApi.js`.
- Added `docs/system_architecture.md` for code-aligned system documentation.

**Why this change should be there**

- ML quality does not depend only on the clustering algorithm. It also depends on correct configuration, clean service startup, reliable DB access, and a frontend that can correctly surface the results.
- If the backend and frontend are not aligned, even a good clustering result looks broken to the user.

**How it improves product quality and the ML pipeline**

- Improves end-to-end consistency between ML output and UI presentation.
- Makes the AI service easier to run and debug across environments.
- Gives the team a reference architecture document, which reduces confusion and speeds up maintenance.

---

### 3. `3e3a46f9c669d7dfa53ff94997a73877134b1b06`
**Title:** 12 bugs fixed in backend and ML and file add what has change  
**Date:** March 17, 2026

**What changed**

- Fixed multiple bugs across `model_manager.py`, `clustering_service.py`, `face_service.py`, and `training_service.py`.
- Fixed related API issues in attendee, clustering, event, and photo routers.
- Updated `backend/general_api/services/face_service.py`.
- Added a bug-fix document for tracking the corrections made in this stage.

**Why this change should be there**

- Small backend and ML bugs create large downstream issues in a photo-clustering system.
- A bad bounding box, broken model load, invalid embedding path, or incorrect cluster persistence can silently degrade the entire pipeline.
- Stabilizing these defects early was necessary before adding more product-facing features.

**How it improves product quality and the ML pipeline**

- Reduces silent failures in model loading, face extraction, and cluster persistence.
- Improves reliability of attendee-facing APIs that depend on correct clustering output.
- Raises confidence that the pipeline can be used in real event flows instead of only in local testing.

---

### 4. `fd7554dade3348349bc16a8a98ae90a724d33823`
**Title:** logig has improved  
**Date:** March 23, 2026

**What changed**

- Added much stronger logging and operational visibility across the AI pipeline.
- Expanded AI-side work in `clustering_service.py`, `face_service.py`, `training_service.py`, `main.py`, and `diagnose_faces.py`.
- Added `COMMANDS_AND_LOGIN_GUIDE.md` and `backend/general_api/auth_utils.py`.
- Restored and improved mail and notification support.
- Added or updated major frontend flows including `AttendeeAccess.jsx`, `ConsoleLandingPage.jsx`, `AttendeeRegistration.jsx`, `AttendeeWelcome.jsx`, `EventLandingPage.jsx`, `OrganizerDashboard.jsx`, and related API utilities.
- Added UI support components like `DetectedFaceCard.jsx`.

**Why this change should be there**

- Once the pipeline became more serious, the next bottleneck was observability.
- Without stronger logging, ML jobs are very hard to debug in production because failures can happen in model load, S3 access, face detection, DB persistence, or attendee linking.
- The product also needed stronger auth helpers and smoother attendee access flows so that ML results could actually reach the right users.

**How it improves product quality and the ML pipeline**

- Makes it much easier to diagnose why a clustering job succeeded, failed, or produced weak results.
- Improves role-based access control so users see only the data they should see.
- Raises perceived product quality because attendee and organizer journeys become more complete, less confusing, and easier to support.

---

### 5. `d8c83dd40c5e58a606f5f906aa4d64e647def094`
**Title:** feat: Add highlight reel feature for events and attendees  
**Date:** March 29, 2026

**What changed**

- Added highlight-reel endpoints and related data flows for both organizers and attendees.
- Updated `backend/general_api/routers/attendees.py` and `backend/general_api/routers/organizer.py` to expose highlight-focused APIs.
- Updated `frontend/src/pages/AttendeeDashboard.jsx`, `frontend/src/pages/OrganizerDashboard.jsx`, `ClusterGrid.jsx`, and `frontend/src/services/api.js` to consume and present highlight content.
- Added `backend/ai_api/services/reference_face_service.py` and `backend/scripts/build_reference_model.py` as part of an experiment to support reference-driven face quality and clustering.
- Added local dataset and reference-face assets during that experimentation stage.

**Why this change should be there**

- Users do not want only a raw cluster dump. They want the best photos first.
- Highlight reels convert clustering output into a directly valuable product experience.
- The reference-face experiment shows an attempt to increase identity quality and prioritization with stronger face anchors.

**How it improves product quality and the ML pipeline**

- Improves product quality by surfacing the best attendee and event photos instead of forcing users to browse everything manually.
- Increases the practical usefulness of clustering quality because the top-ranked faces become visible immediately.
- Creates a bridge between backend ML signals like face quality and frontend user experience.

---

### 6. `dea7499213dd70bcd39594178e6803e5d609c37d`
**Title:** fix: narrow optional seed labels in clustering service  
**Date:** March 29, 2026

**What changed**

- Tightened the optional seed-label logic in `backend/ai_api/services/clustering_service.py`.

**Why this change should be there**

- Seed-based clustering logic can accidentally leak label assumptions into the main unsupervised pipeline.
- If optional seed labels are too broad, they can create incorrect cluster label collisions or mis-group identities.

**How it improves product quality and the ML pipeline**

- Makes cluster labeling safer and more controlled.
- Reduces the chance that experimental reference data corrupts normal clustering behavior.
- Protects cluster purity, which directly improves attendee-photo matching accuracy.

---

### 7. `1f2bddedc16b09d47904961707721bcbdae3e19e`
**Title:** fix: ignore local face data and track model artifact  
**Date:** March 29, 2026

**What changed**

- Added ignore rules in `.gitignore` for local face data and similar generated assets.
- Removed committed local dataset and reference-face image files from version control.
- Tracked a generated model artifact instead of keeping all local image data inside the repository.

**Why this change should be there**

- Repositories should not accumulate bulky local datasets, generated face samples, or environment-specific experiment files.
- Keeping raw local face data in source control increases repo size, hurts portability, and can create privacy and maintenance concerns.

**How it improves product quality and the ML pipeline**

- Keeps the repository cleaner and more production-ready.
- Makes deployments and collaboration easier because only important artifacts are tracked.
- Reduces accidental dependence on local experimental data that may not exist in other environments.

---

### 8. `93f7f90cf0d50182279537cd54c3011da99d50bc`
**Title:** Remove outdated testing documentation and project README  
**Date:** March 29, 2026

**What changed**

- Removed outdated documents such as `testing.md`, `bug fix.md`, and the earlier branch-specific README.
- Reworked the root `README.md` so the repository had a more current and centralized explanation.

**Why this change should be there**

- Old documentation becomes dangerous when it no longer matches the code.
- For an ML-heavy system, outdated docs can cause the team to follow the wrong setup steps, trust the wrong flow, or debug the wrong component.

**How it improves product quality and the ML pipeline**

- Creates a cleaner source of truth for setup and architecture understanding.
- Reduces onboarding friction for new contributors.
- Prevents operational mistakes caused by stale instructions.

---

### 9. `91969f4748b0e22efe3ed48d66f0d2baa91c60e8`
**Title:** Improve face clustering pipeline and restore missing notification scripts  
**Date:** March 30, 2026

**What changed**

- Continued refining `clustering_service.py`, `face_service.py`, `training_service.py`, and `diagnose_faces.py`.
- Removed `clustering_service_v2.py`, reducing duplicate or diverging clustering paths.
- Replaced the earlier reference-model build script with `backend/scripts/audit_reference_model.py`.
- Restored missing notification scripts through `backend/general_api/invitation_service.js` and `backend/general_api/photographer_notification.js`.
- Added temporary face-pipeline analysis documents for the state of the pipeline at that time.

**Why this change should be there**

- Duplicate pipeline files create confusion and increase the chance that developers fix the wrong implementation.
- Notification scripts are product-critical because clustering is part of a longer workflow that includes attendee and photographer communication.
- Auditing model quality is more useful in the long term than keeping unbounded experimental assets in the repo.

**How it improves product quality and the ML pipeline**

- Simplifies the ML code path so the active implementation is easier to reason about and maintain.
- Restores complete workflow quality, not just model quality, by bringing back missing communication scripts.
- Adds audit tooling that helps evaluate the real quality of reference or model behavior.

---

### 10. `8370cfa64ae054a1788614383006297c71783357`
**Title:** fix: improve face clustering and filter cartoon false positives  
**Date:** March 30, 2026

**What changed**

- Improved face filtering and clustering logic in `backend/ai_api/services/face_service.py`, `clustering_service.py`, and `training_service.py`.
- Removed `reference_face_service.py` and temporary face-pipeline analysis documents, indicating a move away from that earlier experimental path.
- Strengthened false-positive filtering for cartoons, posters, illustrations, and other non-face content.
- Updated the landing experience with a major redesign in `frontend/src/pages/LandingPage.jsx` and `frontend/src/pages/landing-photo.css`.

**Why this change should be there**

- In event albums, background posters, printed photos, artwork, cartoon graphics, and non-human shapes can all pollute the ML pipeline if they are accepted as real faces.
- Bad detections create bad embeddings, bad clusters, and bad attendee matches.
- Removing false positives at the face-service layer is much cheaper and more effective than trying to repair them later.

**How it improves product quality and the ML pipeline**

- Improves precision by rejecting fake or low-value detections before clustering begins.
- Protects cluster quality because only more trustworthy embeddings reach the grouping step.
- Improves attendee trust because users are less likely to see unrelated or nonsensical photos in their personal gallery.
- The landing-page refresh also improves the first impression of the product and better matches the maturity of the backend improvements.

---

### 11. `fe3a52f05f26f63c831cdc673916404c534f9ff1`
**Title:** ui improve  
**Date:** March 31, 2026

**What changed**

- Refined `frontend/src/pages/AttendeeDashboard.jsx`.
- Improved the attendee-facing presentation of clustered photos, highlight views, and related interactions.

**Why this change should be there**

- The ML system creates value only when the attendee can clearly understand and use the result.
- After improving the clustering backend, it was necessary to improve the page where attendees actually consume those outputs.

**How it improves product quality and the ML pipeline**

- Makes the ML result easier to browse, trust, and download.
- Improves the final step of the pipeline: delivery of matched photos to the end user.
- Increases perceived product quality because the dashboard feels more intentional and polished.

---

## Cross-Branch Quality Gains

### A. ML Pipeline Quality Gains

- Cleaner face preprocessing with stronger filtering before clustering.
- Better handling of confidence, quality score, blur, face size, and duplicate detections.
- Improved cluster formation consistency and better scalability for larger events.
- Better attendee-to-cluster linking through more reliable embeddings and centroids.
- Reduced false positives from cartoons, posters, and non-face imagery.
- Better diagnostic and audit support for understanding model behavior.

### B. Product Quality Gains

- Better attendee onboarding and access flows.
- Stronger organizer and attendee dashboards.
- Highlight reel support to surface the best content first.
- Better landing pages and role-based user journeys.
- Restored notification scripts so workflows feel complete rather than partially connected.

### C. Engineering and Delivery Quality Gains

- Better logging and debugging support for the AI pipeline.
- Better auth boundaries and operational guardrails.
- Better documentation around architecture and setup.
- Cleaner repository hygiene through removal of local experimental data and outdated documents.

---

## Final Assessment

From `f6150cd9e5261aca503242c3df717b70ba5f5049` to `fe3a52f05f26f63c831cdc673916404c534f9ff1`, the `vaibhav-burad` branch evolved from core clustering stabilization into a more complete product-quality branch.

The most important business value of this branch is not a single feature. The value is that it improves the full chain:

- better face detection quality
- better clustering quality
- better attendee matching quality
- better debugging and operational reliability
- better presentation of ML results to organizers and attendees

That combination increases both technical quality and perceived product quality, which is exactly what an ML-enabled customer-facing platform needs.
