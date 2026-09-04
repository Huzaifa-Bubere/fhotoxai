/**
 * Photo Clustering API utilities
 * Functions to interact with the photo clustering backend
 * Note: Photo clustering endpoints are now part of face_api.py
 */

import { API_BASE_URL, S3_UPLOADS_URL, CLOUDFRONT_URL } from '../services/api';

const PHOTO_CLUSTERING_BASE = `${API_BASE_URL}/face`;

const CLUSTERING_ROUTER_BASE = `${API_BASE_URL}/clustering`;

const normalizePhotoPath = (filePath) =>
  filePath.replace(/\\/g, '/').replace(/^\/+/, '');

const stripUploadsPrefix = (normalizedPath) => {
  const uploadsIndex = normalizedPath.toLowerCase().lastIndexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalizedPath.slice(uploadsIndex + '/uploads/'.length);
  }

  if (normalizedPath.toLowerCase().startsWith('uploads/')) {
    return normalizedPath.slice('uploads/'.length);
  }

  return normalizedPath;
};

const isLikelyLocalUploadPath = (normalizedPath, storageType) => {
  if (storageType === 'local') return true;
  if (storageType === 's3') return false;

  return (
    /^[a-zA-Z]:\//.test(normalizedPath) ||
    normalizedPath.startsWith('event_') ||
    normalizedPath.startsWith('uploads/event_') ||
    normalizedPath.includes('/uploads/event_') ||
    normalizedPath.includes('/event_')
  );
};

/**
 * Search/Match face against existing clusters
 */
export const searchFace = async (imageBlob, eventId = '1') => {
  const formData = new FormData();
  formData.append('file', imageBlob);
  formData.append('event_id', eventId);

  const AI_API_URL = import.meta.env.VITE_AI_API_URL?.replace(/\/+$/, '') || '/ai-api';
  const response = await fetch(`${AI_API_URL}/processing/recognize`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Face search failed');
  }
  return await response.json();
};

/**
 * Get training analytics metrics from database
 */
export const getTrainingMetrics = async (eventId = null) => {
  const url = eventId
    ? `${CLUSTERING_ROUTER_BASE}/metrics?event_id=${eventId}`
    : `${CLUSTERING_ROUTER_BASE}/metrics`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch training metrics');

  const data = await response.json();

  console.log('Raw metrics from API:', data);

  // Convert snake_case to camelCase for frontend
  const metrics = {
    totalPhotos: data.total_photos || 0,
    totalFaces: data.total_faces || 0,
    uniqueIdentities: data.unique_identities || 0,
    completionStatus: data.completion_status || '0%',
    lastTrainingTimestamp: data.last_training_timestamp || null,
    trainingInProgress: data.training_in_progress || false
  };

  console.log('Converted metrics:', metrics);

  return metrics;
};

/**
 * Start training process for an event
 */
export const startTraining = async (eventId, adminId) => {
  const formData = new FormData();
  formData.append('event_id', eventId);
  formData.append('admin_id', adminId);

  const response = await fetch(`${CLUSTERING_ROUTER_BASE}/start`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start training');
  }

  return await response.json();
};

/**
 * Get active trainings with progress
 */
export const getActiveTrainings = async () => {
  const response = await fetch(`${CLUSTERING_ROUTER_BASE}/active`);
  if (!response.ok) throw new Error('Failed to fetch active trainings');
  const data = await response.json();
  return data || [];
};

/**
 * Get active uploads with progress
 */
export const getActiveUploads = async () => {
  const response = await fetch(`${API_BASE_URL}/photos/upload/active`);
  if (!response.ok) throw new Error('Failed to fetch active uploads');
  const data = await response.json();
  return data.uploads || [];
};

/**
 * Upload folder of photos
 */
export const uploadFolder = async (eventId, photographerId, files, folderName) => {
  const formData = new FormData();

  // Convert FileList to Array and append each file
  Array.from(files).forEach((file) => {
    formData.append('files', file);
  });

  formData.append('folder_name', folderName);
  formData.append('event_id', eventId);
  formData.append('photographer_id', photographerId);

  const response = await fetch(`${API_BASE_URL}/photos/upload-folder`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return await response.json();
};

/**
 * Get photos for an attendee
 */
export const getAttendeePhotos = async (attendeeId, eventId) => {
  const response = await fetch(
    `${API_BASE_URL}/attendees/${attendeeId}/photos?event_id=${eventId}`
  );

  if (!response.ok) throw new Error('Failed to fetch attendee photos');
  return await response.json();
};

/**
 * Get attendee details (name, email, etc.)
 */
export const getAttendeeDetails = async (attendeeId) => {
  const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch attendee details');
  return await response.json();
};

/**
 * Download attendee photos as ZIP
 */
export const downloadAttendeePhotos = async (photoIds, filename = 'photos') => {
  const response = await fetch(`${API_BASE_URL}/attendees/photos/download-zip?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(photoIds)
  });

  if (!response.ok) throw new Error('Failed to generate download');
  return response;
};

/**
 * Get list of folders/events
 */
export const getFolders = async (eventId = null) => {
  const url = eventId
    ? `${API_BASE_URL}/photos/folders?event_id=${eventId}`
    : `${API_BASE_URL}/photos/folders`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch folders');
  return await response.json();
};

/**
 * Get photos within a specific folder
 */
export const getFolderPhotos = async (folderId, folderName, eventId = 1) => {
  const url = `${API_BASE_URL}/photos/folders/${encodeURIComponent(folderName)}/photos?event_id=${eventId}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch folder photos');
  return await response.json();
};

/**
 * Get photo URL for display
 */
export const getPhotoUrl = (filePath, preferS3 = false, storageType = null) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;

  const normalizedPath = normalizePhotoPath(filePath);

  if (isLikelyLocalUploadPath(normalizedPath, storageType)) {
    const relativeUploadsPath = stripUploadsPrefix(normalizedPath);
    return `${API_BASE_URL}/uploads/${relativeUploadsPath}`;
  }

  const s3Base = preferS3 ? S3_UPLOADS_URL : CLOUDFRONT_URL;
  const s3Path = normalizedPath.toLowerCase().startsWith('uploads/')
    ? normalizedPath
    : `uploads/${normalizedPath}`;

  return `${s3Base}/${s3Path}`;
};

/**
 * Get all face clusters for an event
 */
export const getClusterList = async (eventId) => {
  console.log('🔍 Fetching clusters for event:', eventId);
  console.log('🌐 API URL:', `${API_BASE_URL}/clustering/clusters/${eventId}`);

  const response = await fetch(`${API_BASE_URL}/clustering/clusters/${eventId}`);

  console.log('📡 Response status:', response.status);
  console.log('📡 Response OK:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch clusters:', errorText);
    throw new Error('Failed to fetch face clusters');
  }

  const data = await response.json();
  console.log('✅ Clusters API response:', data);
  console.log('📊 Total clusters:', data.clusters?.length || 0);
  console.log('📊 Total faces:', data.total_faces || 0);

  // Log each cluster details
  if (data.clusters && data.clusters.length > 0) {
    console.log('🔍 First 5 clusters:');
    data.clusters.slice(0, 5).forEach((cluster, idx) => {
      console.log(`  Cluster ${idx + 1}:`, {
        id: cluster.id,
        name: cluster.name,
        total_faces: cluster.total_faces,
        sample_faces: cluster.sample_faces?.length || 0
      });
    });
  }

  return data;
};

/**
 * Get every detected face for an event without grouping.
 */
export const getEventFaces = async (eventId) => {
  const response = await fetch(`${API_BASE_URL}/clustering/events/${eventId}/faces`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch event faces:', errorText);
    throw new Error('Failed to fetch detected faces');
  }

  return await response.json();
};

/**
 * Get all faces for a specific cluster
 */
export const getClusterFaces = async (clusterId, limit = 100, offset = 0) => {
  const response = await fetch(
    `${API_BASE_URL}/clustering/clusters/${clusterId}/faces?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) throw new Error('Failed to fetch cluster faces');
  return await response.json();
};

/**
 * Update cluster name
 */
export const updateClusterName = async (clusterId, newName) => {
  const formData = new FormData();
  formData.append('cluster_id', clusterId);
  formData.append('name', newName);

  const response = await fetch(`${API_BASE_URL}/clustering/clusters/rename`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) throw new Error('Failed to update cluster name');
  return await response.json();
};

/**
 * Delete a folder and its photos
 */
export const deleteFolder = async (folderName, eventId) => {
  const response = await fetch(`${API_BASE_URL}/photos/folders/${encodeURIComponent(folderName)}?event_id=${eventId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete folder');
  }

  return await response.json();
};
