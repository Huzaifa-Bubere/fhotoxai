import React, { useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, X, Clock3, Film, Info } from 'lucide-react';
import AILoader from '../ui/AILoader';
import { getPhotoUrl } from '../../utils/photoClusteringApi';
import { videoAPI } from '../../utils/videoApi';

const SOURCE_FILTERS = [
  { id: 'all', label: 'All photos' },
  { id: 'uploaded', label: 'Uploaded photos' },
  { id: 'video', label: 'Video-extracted' },
];

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
};

const formatTimestampMs = (ms) => {
  if (ms === null || ms === undefined) return null;
  const total = Math.max(0, Math.round(Number(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Photos tab: backend-derived stats, source filters (all / uploaded /
 * video-extracted) and a preview modal showing the video frame provenance.
 */
const PhotosTab = ({ eventId, refreshKey }) => {
  const [source, setSource] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await videoAPI.listPhotosBySource(eventId, source, 1, 120);
      setData(payload);
    } catch (err) {
      setError(err.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [eventId, source]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const counts = data?.source_counts || { all: 0, uploaded: 0, video: 0 };

  return (
    <div>
      {/* Source filter chips with backend-derived counts */}
      <div
        role="tablist"
        aria-label="Photo source filter"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}
      >
        {SOURCE_FILTERS.map((filter) => {
          const isActive = source === filter.id;
          const count = counts[filter.id] ?? 0;
          return (
            <button
              key={filter.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSource(filter.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '999px',
                border: `1px solid ${isActive ? 'var(--ws-accent)' : 'var(--ws-border)'}`,
                background: isActive ? 'var(--ws-accent-soft)' : '#fff',
                color: isActive ? 'var(--ws-accent)' : 'var(--ws-text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {filter.label}
              <span
                style={{
                  background: isActive ? 'var(--ws-accent)' : '#eef0f3',
                  color: isActive ? '#fff' : 'var(--ws-text-muted)',
                  borderRadius: '999px',
                  padding: '0 0.4rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AILoader active text="LOADING PHOTOS" />
        </div>
      ) : error ? (
        <div className="ws-card" style={{ padding: '2rem', color: 'var(--ws-text-muted)', textAlign: 'center' }}>
          <ImageIcon size={36} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          <button className="ws-btn" style={{ marginTop: '1rem' }} onClick={load}>Retry</button>
        </div>
      ) : !data?.photos?.length ? (
        <div className="ws-card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--ws-text-muted)' }}>
          <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 700, margin: '0 0 0.35rem' }}>
            {source === 'video' ? 'No video-extracted photos yet' : 'No photos in this view'}
          </p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {source === 'video'
              ? 'Use the Videos tab to extract frames from an event video and import them here.'
              : 'Upload photos or extract video frames to populate the gallery.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '0.9rem',
          }}
        >
          {data.photos.map((photo) => {
            const isVideo = photo.source_video_id !== null && photo.source_video_id !== undefined;
            const ts = formatTimestampMs(photo.source_timestamp_ms);
            return (
              <button
                key={photo.id}
                onClick={() => setPreview(photo)}
                aria-label={`Preview photo ${photo.original_filename || photo.id}`}
                style={{
                  position: 'relative',
                  border: '1px solid var(--ws-border)',
                  borderRadius: 'var(--ws-radius)',
                  overflow: 'hidden',
                  background: '#f1f2f4',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <img
                  src={getPhotoUrl(photo.file_path, false, photo.storage_type)}
                  alt={photo.original_filename || `Photo ${photo.id}`}
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.currentTarget.style.opacity = 0.25; }}
                />
                {isVideo && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.45rem',
                      top: '0.45rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(79, 70, 229, 0.9)',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '0.15rem 0.4rem',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                    }}
                  >
                    <Film size={10} /> {ts || 'Video'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Preview modal with source provenance */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: '1.5rem',
          }}
        >
          <div
            className="ws-card"
            style={{ maxWidth: '880px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--ws-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview.original_filename || `Photo #${preview.id}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <span>{formatBytes(preview.file_size)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    {preview.source_video_id !== null && preview.source_video_id !== undefined ? (
                      <>
                        <Film size={12} />
                        Extracted from video #{preview.source_video_id}
                        {preview.source_timestamp_ms !== null && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock3 size={12} /> at {formatTimestampMs(preview.source_timestamp_ms)}
                          </span>
                        )}
                      </>
                    ) : (
                      <><ImageIcon size={12} /> Uploaded photo</>
                    )}
                  </span>
                </div>
              </div>
              <button className="ws-btn ws-btn--ghost" aria-label="Close preview" onClick={() => setPreview(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <img
                src={getPhotoUrl(preview.file_path, false, preview.storage_type)}
                alt={preview.original_filename || `Photo ${preview.id}`}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
            {preview.source_video_id !== null && preview.source_video_id !== undefined && (
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--ws-border)', background: '#fafbfc', display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--ws-text-secondary)' }}>
                <Info size={14} style={{ color: 'var(--ws-accent)', flexShrink: 0 }} />
                Person grouping must be re-run by the organizer for new video photos to appear in People.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosTab;
