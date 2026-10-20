/**
 * Video-to-Photos API utilities.
 *
 * All endpoints are session-authenticated (cookie based); frame previews
 * are streamed through the access-checked /videos/frames/{id}/file
 * endpoint, never a public static path.
 */

import { API_BASE } from '../services/api';

const buildUrl = (path, params) => {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${API_BASE}${path}${qs}`;
};

const request = async (path, options = {}) => {
  const config = {
    credentials: 'include',
    ...options,
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
    config.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  }
  const response = await fetch(buildUrl(path), config);
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      detail = data.detail || data.message || detail;
    } catch (_) {
      // keep default
    }
    const error = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    error.status = response.status;
    throw error;
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Limits + job lifecycle
// ---------------------------------------------------------------------------

export const videoAPI = {
  /** Server-enforced application limits (display these before upload). */
  getLimits: () => request('/videos/limits'),

  /** Job history for the event. */
  listJobs: (eventId) => request(`/videos/events/${eventId}/jobs`),

  /** Job details incl. progress, stage, counters, actionable error. */
  getJob: (jobId) => request(`/videos/jobs/${jobId}`),

  /** Paginated frame previews (server pagination; restore-safe). */
  getFrames: (jobId, { status = 'preview', page = 1, pageSize = 24 } = {}) =>
    request(
      `/videos/jobs/${jobId}/frames?` +
        new URLSearchParams({ frame_status: status, page, page_size: pageSize }).toString(),
    ),

  /** Import selected preview frames into the event gallery. */
  importFrames: (jobId, frameIds) => {
    const form = new FormData();
    frameIds.forEach((id) => form.append('frame_ids', String(id)));
    return request(`/videos/jobs/${jobId}/import`, { method: 'POST', body: form });
  },

  cancelJob: (jobId) => request(`/videos/jobs/${jobId}/cancel`, { method: 'POST' }),

  retryJob: (jobId) => request(`/videos/jobs/${jobId}/retry`, { method: 'POST' }),

  deleteJob: (jobId) => request(`/videos/jobs/${jobId}`, { method: 'DELETE' }),

  /** Photos with source filters: all | uploaded | video */
  listPhotosBySource: (eventId, source = 'all', page = 1, pageSize = 60) =>
    request(
      `/photos/source?` +
        new URLSearchParams({
          event_id: eventId,
          source,
          page,
          page_size: pageSize,
        }).toString(),
    ),
};

/**
 * Upload a video with XHR so the caller gets real byte-transfer progress
 * (upload phase only — extraction progress comes from polling the job).
 */
export const uploadVideo = ({ eventId, file, settings, onUploadProgress, signalLike }) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('interval_sec', String(settings.interval_sec ?? 1));
    if (settings.start_sec !== undefined && settings.start_sec !== null && settings.start_sec !== '') {
      form.append('start_sec', String(settings.start_sec));
    }
    if (settings.end_sec !== undefined && settings.end_sec !== null && settings.end_sec !== '') {
      form.append('end_sec', String(settings.end_sec));
    }
    form.append('faces_only', settings.faces_only ? 'true' : 'false');
    form.append('blur_filter', settings.blur_filter ? 'true' : 'false');
    form.append('duplicate_filter', settings.duplicate_filter ? 'true' : 'false');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/videos/events/${eventId}/upload`);
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100), event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (_) {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const message =
          (data && (data.detail || data.message)) || `Upload failed (${xhr.status})`;
        const error = new Error(typeof message === 'object' ? JSON.stringify(message) : message);
        error.status = xhr.status;
        reject(error);
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed: network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    if (signalLike && signalLike.addEventListener) {
      signalLike.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(form);
  });

export default videoAPI;
