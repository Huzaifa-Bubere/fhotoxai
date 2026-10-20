import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Film, UploadCloud, Clock3, Eye, Ban, RotateCcw, Trash2, CheckCircle2,
  AlertTriangle, Settings2, ChevronDown, Sparkles, Info, Loader2,
} from 'lucide-react';
import { videoAPI, uploadVideo } from '../../utils/videoApi';

const INTERVAL_CHOICES = [0.5, 1, 2, 5];

const formatTimestamp = (ms) => {
  const total = Math.max(0, Math.round(Number(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
};

const STATUS_BADGES = {
  queued: { label: 'QUEUED', className: 'ws-badge ws-badge--queued' },
  processing: { label: 'PROCESSING', className: 'ws-badge ws-badge--processing' },
  completed: { label: 'COMPLETED', className: 'ws-badge ws-badge--completed' },
  failed: { label: 'FAILED', className: 'ws-badge ws-badge--failed' },
  cancelled: { label: 'CANCELLED', className: 'ws-badge ws-badge--cancelled' },
};

const STAGE_LABELS = {
  probe: 'Inspecting video (ffprobe)',
  extract: 'Extracting frames (ffmpeg)',
  analyze: 'Analyzing frames (quality / duplicates / faces)',
  ready: 'Ready for review',
};

const ACTIVE_STATUSES = ['queued', 'processing'];

const VideoWorkflow = ({ eventId, uploadFinalized, onGalleryChanged }) => {
  const [limits, setLimits] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // Upload state — kept strictly separate from extraction progress.
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Extraction settings
  const [interval, setIntervalSec] = useState(1);
  const [startSec, setStartSec] = useState('');
  const [endSec, setEndSec] = useState('');
  const [facesOnly, setFacesOnly] = useState(false);
  const [blurFilter, setBlurFilter] = useState(true);
  const [duplicateFilter, setDuplicateFilter] = useState(true);
  const [showSettings, setShowSettings] = useState(true);

  // Frame preview state
  const [openJobId, setOpenJobId] = useState(null);
  const [framesData, setFramesData] = useState(null);
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadLimits = useCallback(async () => {
    try {
      const data = await videoAPI.getLimits();
      setLimits(data);
      if (data?.allowed_intervals?.length) {
        setIntervalSec(data.default_interval ?? data.allowed_intervals[1] ?? 1);
      }
    } catch {
      // fall back to documented defaults
      setLimits({
        max_upload_mb: 250, max_duration_sec: 300, max_candidate_frames: 300,
        allowed_intervals: INTERVAL_CHOICES, default_interval: 1,
        blur_laplacian_min: 30, duplicate_hamming_max: 6,
      });
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await videoAPI.listJobs(eventId);
      setJobs(data.jobs || []);
      setJobsError(null);
    } catch (err) {
      setJobsError(err.message || 'Failed to load video jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadLimits();
    loadJobs();
  }, [loadLimits, loadJobs]);

  // Poll while any job is active; refresh history when they settle.
  useEffect(() => {
    const hasActive = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));
    if (!hasActive) return undefined;
    pollRef.current = setInterval(async () => {
      try {
        const data = await videoAPI.listJobs(eventId);
        setJobs(data.jobs || []);
      } catch {
        // transient failure; keep polling
      }
    }, 2500);
    return () => clearInterval(pollRef.current);
  }, [jobs, eventId]);

  const loadFrames = useCallback(async (jobId, page = 1) => {
    setFramesLoading(true);
    try {
      const data = await videoAPI.getFrames(jobId, { status: 'preview', page, pageSize: 24 });
      setFramesData(data);
    } catch (err) {
      setFramesData({ frames: [], total: 0, total_pages: 1, error: err.message });
    } finally {
      setFramesLoading(false);
    }
  }, []);

  const openJobFrames = (jobId) => {
    if (openJobId === jobId) {
      setOpenJobId(null);
      setFramesData(null);
      setSelectedIds(new Set());
      return;
    }
    setOpenJobId(jobId);
    setSelectedIds(new Set());
    loadFrames(jobId, 1);
  };

  // ------------------------------------------------------------------
  // Upload + job creation
  // ------------------------------------------------------------------

  const validateFile = (candidate) => {
    if (!candidate) return 'No file selected.';
    const ext = candidate.name.toLowerCase().split('.').pop();
    if (!['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) {
      return 'Unsupported file type. Use MP4, MOV or WebM.';
    }
    const maxMb = limits?.max_upload_mb ?? 250;
    if (candidate.size > maxMb * 1024 * 1024) {
      return `Video is ${(candidate.size / 1024 / 1024).toFixed(0)} MB — the limit is ${maxMb} MB.`;
    }
    return null;
  };

  const handleUpload = async (candidate) => {
    const problem = validateFile(candidate);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(null);
    setFile(candidate);
    setIsUploading(true);
    setUploadProgress(0);
    const abortController = new AbortController();
    abortRef.current = abortController;
    try {
      const result = await uploadVideo({
        eventId,
        file: candidate,
        settings: {
          interval_sec: interval,
          start_sec: startSec === '' ? null : Number(startSec),
          end_sec: endSec === '' ? null : Number(endSec),
          faces_only: facesOnly,
          blur_filter: blurFilter,
          duplicate_filter: duplicateFilter,
        },
        onUploadProgress: (percent) => setUploadProgress(percent),
        signalLike: abortController.signal,
      });
      await loadJobs();
      setOpenJobId(result.job_id);
      setSelectedIds(new Set());
      loadFrames(result.job_id, 1);
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        setUploadError(err.message || 'Upload failed');
      }
    } finally {
      setIsUploading(false);
      setFile(null);
      abortRef.current = null;
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (uploadFinalized || isUploading) return;
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) handleUpload(dropped);
  };

  // ------------------------------------------------------------------
  // Job actions
  // ------------------------------------------------------------------

  const actOnJob = async (jobId, action, refresh) => {
    try {
      await action();
      await loadJobs();
      if (refresh) refresh();
    } catch (err) {
      window.alert(err.message || 'Action failed');
    }
  };

  const handleImport = async (jobId) => {
    if (!selectedIds.size) return;
    setImporting(true);
    try {
      const result = await videoAPI.importFrames(jobId, [...selectedIds]);
      setSelectedIds(new Set());
      await Promise.all([loadJobs(), loadFrames(jobId, framesData?.page || 1)]);
      if (onGalleryChanged) onGalleryChanged();
      const note = result.skipped > 0 ? ` (${result.skipped} already imported skipped)` : '';
      window.alert(`Imported ${result.imported} photo(s) into the event gallery.${note}`);
    } catch (err) {
      window.alert(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleFrame = (frameId, frameStatus) => {
    if (frameStatus !== 'preview') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(frameId)) next.delete(frameId);
      else next.add(frameId);
      return next;
    });
  };

  const uploadAllowed = !uploadFinalized && !isUploading;
  const maxMb = limits?.max_upload_mb ?? 250;
  const maxDur = limits?.max_duration_sec ?? 300;
  const maxFrames = limits?.max_candidate_frames ?? 300;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Limits + guidance */}
      <div className="ws-card-muted" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Info size={18} style={{ color: 'var(--ws-accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--ws-text-secondary)', lineHeight: 1.55 }}>
          <strong style={{ display: 'block', color: 'var(--ws-text)', marginBottom: '0.2rem' }}>
            Server-side extraction limits
          </strong>
          Up to <strong>{maxMb} MB</strong> per video, <strong>
            {maxDur < 60 ? `${maxDur}s` : `${Math.floor(maxDur / 60)} min`}
          </strong> long, <strong>{maxFrames}</strong> candidate frames
          {limits?.allowed_intervals && (
            <> — sample every <strong>{limits.allowed_intervals.join(', ')}s</strong></>
          )}. These are enforced per environment; ask an admin if your event needs more.
          <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--ws-text-muted)' }}>
            Note: coarse sampling can miss brief appearances — retry with a shorter interval or filters off.
          </span>
        </div>
      </div>

      {/* Uploader */}
      {uploadFinalized ? (
        <div className="ws-card" style={{ padding: '1.25rem', background: 'var(--ws-success-soft)', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>
            Upload finalized — video import disabled for this event.
          </div>
        </div>
      ) : (
        <div
          className={`ws-dropzone ${dragActive ? 'ws-dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={handleDrop}
          onClick={() => uploadAllowed && inputRef.current?.click()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && uploadAllowed) inputRef.current?.click(); }}
          role="button"
          tabIndex={uploadAllowed ? 0 : -1}
          aria-disabled={!uploadAllowed}
          aria-label="Upload video: drag and drop or press Enter to browse"
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v,.avi,.mkv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const candidate = e.target.files?.[0];
              e.target.value = '';
              if (candidate) handleUpload(candidate);
            }}
          />
          <UploadCloud size={34} style={{ color: 'var(--ws-accent)', marginBottom: '0.75rem' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ws-text)' }}>
            {isUploading ? `Uploading ${file?.name || 'video'}…` : 'Drag & drop an event video'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ws-text-muted)', marginTop: '0.3rem' }}>
            or <strong style={{ color: 'var(--ws-accent)' }}>browse your device</strong> — MP4, MOV, WebM up to {maxMb} MB
          </div>
          {isUploading && (
            <div style={{ width: 'min(420px, 90%)', margin: '1rem auto 0' }}>
              <div className="ws-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                <div className="ws-progress__bar" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ws-text-muted)', marginTop: '0.35rem' }}>
                Uploading file — {uploadProgress}% (real byte-transfer progress)
                {uploadProgress === 100 && ' — server is validating and queueing…'}
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div role="alert" className="ws-card" style={{ padding: '0.9rem 1.1rem', background: 'var(--ws-danger-soft)', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.85rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {uploadError}
        </div>
      )}

      {/* Extraction settings */}
      <div className="ws-card" style={{ overflow: 'hidden' }}>
        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ws-text)' }}>
            <Settings2 size={18} style={{ color: 'var(--ws-accent)' }} /> Extraction settings
          </span>
          <ChevronDown size={18} style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--ws-text-muted)' }} />
        </button>
        {showSettings && (
          <div style={{ padding: '0.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--ws-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.9rem', marginTop: '1rem' }}>
              <div className="ws-field" style={{ marginBottom: 0 }}>
                <span className="ws-label">Frame interval</span>
                <div role="radiogroup" aria-label="Frame interval seconds" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(limits?.allowed_intervals || INTERVAL_CHOICES).map((choice) => (
                    <button
                      key={choice}
                      role="radio"
                      aria-checked={interval === choice}
                      onClick={() => setIntervalSec(choice)}
                      disabled={isUploading}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '9px',
                        border: `1px solid ${interval === choice ? 'var(--ws-accent)' : 'var(--ws-border)'}`,
                        background: interval === choice ? 'var(--ws-accent)' : '#fff',
                        color: interval === choice ? '#fff' : 'var(--ws-text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {choice}s
                    </button>
                  ))}
                </div>
                <span className="ws-hint">How often a frame is sampled (default {limits?.default_interval ?? 1}s).</span>
              </div>

              <div className="ws-field" style={{ marginBottom: 0 }}>
                <label className="ws-label" htmlFor="ws-start-sec">Start time (sec)</label>
                <input
                  id="ws-start-sec" className="ws-input" inputMode="decimal" placeholder="e.g. 0"
                  value={startSec} onChange={(e) => setStartSec(e.target.value)} disabled={isUploading}
                />
              </div>
              <div className="ws-field" style={{ marginBottom: 0 }}>
                <label className="ws-label" htmlFor="ws-end-sec">End time (sec)</label>
                <input
                  id="ws-end-sec" className="ws-input" inputMode="decimal" placeholder="optional"
                  value={endSec} onChange={(e) => setEndSec(e.target.value)} disabled={isUploading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {[
                { checked: blurFilter, set: setBlurFilter, id: 'ws-blur', label: 'Blur filter', hint: 'discard very blurry frames' },
                { checked: duplicateFilter, set: setDuplicateFilter, id: 'ws-dup', label: 'Near-duplicate filter', hint: 'skip visually identical frames' },
                { checked: facesOnly, set: setFacesOnly, id: 'ws-faces', label: 'Keep faces only', hint: 'requires face models on the server' },
              ].map((toggle) => (
                <label key={toggle.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.85rem', color: 'var(--ws-text-secondary)', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1 }}>
                  <input
                    id={toggle.id} type="checkbox" checked={toggle.checked}
                    onChange={(e) => toggle.set(e.target.checked)} disabled={isUploading}
                    style={{ width: 16, height: 16, accentColor: 'var(--ws-accent)' }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--ws-text)' }}>{toggle.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ws-text-faint)' }}>{toggle.hint}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Job history */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 className="ws-section-title" style={{ margin: 0 }}>Video jobs</h3>
          <button className="ws-btn ws-btn--ghost" onClick={loadJobs} aria-label="Refresh job history">
            <RotateCcw size={14} /> Refresh
          </button>
        </div>

        {jobsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ws-text-muted)' }}>
            <Loader2 size={22} className="ws-spin" style={{ animation: 'ws-spin 1s linear infinite' }} /> Loading jobs…
          </div>
        ) : jobsError ? (
          <div className="ws-card" style={{ padding: '1.25rem', color: 'var(--ws-danger)', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} /> {jobsError}
            <button className="ws-btn" style={{ marginLeft: '0.75rem' }} onClick={loadJobs}>Retry</button>
          </div>
        ) : !jobs.length ? (
          <div className="ws-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--ws-text-muted)' }}>
            <Film size={34} style={{ opacity: 0.3, marginBottom: '0.6rem' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>No videos processed yet</p>
            <p style={{ fontSize: '0.82rem', margin: '0.3rem 0 0' }}>Upload a video above to extract preview photos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {jobs.map((job) => {
              const badge = STATUS_BADGES[job.status] || STATUS_BADGES.queued;
              const counters = job.counters || {};
              const isActive = ACTIVE_STATUSES.includes(job.status);
              const expanded = openJobId === job.id;
              return (
                <div key={job.id} className="ws-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <Film size={16} style={{ color: 'var(--ws-accent)', flexShrink: 0 }} />
                          <strong style={{ fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.video?.original_filename || `Job #${job.id}`}
                          </strong>
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                        <div style={{ display: 'flex', fontSize: '0.72rem', color: 'var(--ws-text-muted)', gap: '0.9rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                          <span>every {job.settings?.interval_sec ?? '?'}s</span>
                          {job.video?.duration_sec != null && <span>{Math.round(job.video.duration_sec)}s video</span>}
                          {job.video?.size_bytes != null && <span>{formatBytes(job.video.size_bytes)}</span>}
                          <span>{counters.preview_frames ?? 0} previews</span>
                          <span>{job.imported_photos ?? 0} imported</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0 }}>
                        {(job.status === 'completed') && (
                          <button className="ws-btn" onClick={() => openJobFrames(job.id)} aria-expanded={expanded}>
                            <Eye size={14} /> {expanded ? 'Hide frames' : 'Preview frames'}
                          </button>
                        )}
                        {(isActive) && (
                          <button
                            className="ws-btn ws-btn--danger"
                            onClick={() => actOnJob(job.id, () => videoAPI.cancelJob(job.id))}
                          >
                            <Ban size={14} /> Cancel
                          </button>
                        )}
                        {['failed', 'cancelled'].includes(job.status) && !uploadFinalized && (
                          <button
                            className="ws-btn"
                            onClick={() => actOnJob(job.id, () => videoAPI.retryJob(job.id))}
                          >
                            <RotateCcw size={14} /> Retry
                          </button>
                        )}
                        {['failed', 'cancelled', 'completed'].includes(job.status) && !uploadFinalized && (
                          <button
                            className="ws-btn ws-btn--danger"
                            aria-label={`Delete job ${job.id} and its files`}
                            onClick={() => actOnJob(job.id, () => videoAPI.deleteJob(job.id))}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Separate: processing progress (server-side extraction) */}
                    {isActive && (
                      <div>
                        <div className="ws-progress" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Processing progress job ${job.id}`}>
                          <div className="ws-progress__bar" style={{ width: `${Math.max(4, job.progress)}%` }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <Loader2 size={12} style={{ animation: 'ws-spin 1s linear infinite' }} />
                          {STAGE_LABELS[job.stage] || 'Waiting for worker…'} — {job.progress}% (frames found so far)
                        </div>
                      </div>
                    )}

                    {job.status === 'failed' && job.error_message && (
                      <div style={{ background: 'var(--ws-danger-soft)', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#991b1b', display: 'flex', gap: '0.6rem' }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                        {job.error_message}
                      </div>
                    )}

                    {/* Counters after completion */}
                    {job.status === 'completed' && (
                      <div className="ws-counter-grid">
                        {[
                          { label: 'Candidate frames', value: counters.candidate_frames ?? 0 },
                          { label: 'Rejected (blur)', value: counters.rejected_blur ?? 0 },
                          { label: 'Near-duplicates', value: counters.rejected_duplicates ?? 0 },
                          { label: 'Rejected (faces only)', value: counters.rejected_faces ?? 0 },
                          { label: 'Preview frames', value: counters.preview_frames ?? 0, accent: true },
                          { label: 'Imported photos', value: job.imported_photos ?? 0 },
                        ].map((c) => (
                          <div key={c.label} className={`ws-counter ${c.accent ? 'ws-counter--accent' : ''}`}>
                            <div className="ws-counter__value">{c.value}</div>
                            <div className="ws-counter__label">{c.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Frame review panel */}
                  {expanded && job.status === 'completed' && (
                    <div style={{ borderTop: '1px solid var(--ws-border)', padding: '1.1rem 1.25rem', background: '#fafbfc' }}>
                      {framesLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ws-text-muted)' }}>
                          <Loader2 size={20} style={{ animation: 'ws-spin 1s linear infinite' }} /> Loading frames…
                        </div>
                      ) : !framesData?.frames?.length ? (
                        <div style={{ textAlign: 'center', color: 'var(--ws-text-muted)', padding: '1.5rem', fontSize: '0.85rem' }}>
                          No preview frames kept for this job — filtering removed everything.
                          Retry with filters disabled or a shorter interval.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--ws-text-secondary)' }}>
                              Page {framesData.page} / {framesData.total_pages} — {framesData.total} preview frames
                              {framesData.error && <span style={{ color: 'var(--ws-danger)' }}> ({framesData.error})</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                className="ws-btn"
                                disabled={framesData.page <= 1}
                                onClick={() => { loadFrames(job.id, framesData.page - 1); }}
                              >
                                ‹ Prev
                              </button>
                              <button
                                className="ws-btn"
                                disabled={framesData.page >= framesData.total_pages}
                                onClick={() => { loadFrames(job.id, framesData.page + 1); }}
                              >
                                Next ›
                              </button>
                              <button className="ws-btn ws-btn--primary" disabled={importing || !selectedIds.size} onClick={() => handleImport(job.id)}>
                                {importing
                                  ? <Loader2 size={14} style={{ animation: 'ws-spin 1s linear infinite' }} />
                                  : <CheckCircle2 size={14} />}
                                Import selected ({selectedIds.size})
                              </button>
                            </div>
                          </div>

                          <div className="ws-grid-frames">
                            {framesData.frames.map((frame) => {
                              const isSelected = selectedIds.has(frame.id);
                              const isImported = frame.frame_status === 'imported';
                              return (
                                <motion.button
                                  key={frame.id}
                                  whileTap={isImported ? {} : { scale: 0.97 }}
                                  className={`ws-frame ${isSelected ? 'ws-frame--selected' : ''} ${isImported ? 'ws-frame--imported' : ''}`}
                                  onClick={() => isImported ? null : toggleFrame(frame.id, frame.frame_status)}
                                  onDoubleClick={() => setLightbox(frame)}
                                  disabled={isImported}
                                  aria-pressed={isSelected}
                                  aria-label={`Frame at ${formatTimestamp(frame.timestamp_ms)}${isImported ? ' (imported)' : ''}`}
                                >
                                  <img src={frame.preview_url} alt={`Frame at ${formatTimestamp(frame.timestamp_ms)}`} loading="lazy" />
                                  <span className="ws-frame__ts">{formatTimestamp(frame.timestamp_ms)}</span>
                                  {isSelected && (
                                    <span className="ws-frame__check" aria-hidden="true">
                                      <Sparkles size={12} />
                                    </span>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox: shows source video + timestamp provenance */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Frame preview"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 320, padding: '1.5rem' }}
        >
          <div className="ws-card" style={{ maxWidth: '920px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--ws-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  Frame at {formatTimestamp(lightbox.timestamp_ms)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock3 size={12} /> {formatTimestamp(lightbox.timestamp_ms)} into the source video
                  </span>
                  {lightbox.width && <span>{lightbox.width}×{lightbox.height}</span>}
                  {lightbox.quality_score != null && <span>quality {(lightbox.quality_score * 100).toFixed(0)}%</span>}
                  {lightbox.imported_photo_id && <span>imported as photo #{lightbox.imported_photo_id}</span>}
                </div>
              </div>
              <button className="ws-btn ws-btn--ghost" aria-label="Close frame preview" onClick={() => setLightbox(null)}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <img src={lightbox.preview_url} alt={`Frame at ${formatTimestamp(lightbox.timestamp_ms)}`} style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoWorkflow;
