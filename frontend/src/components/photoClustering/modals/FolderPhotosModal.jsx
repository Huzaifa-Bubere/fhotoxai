import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFolderPhotos, getPhotoUrl } from '../../../utils/photoClusteringApi';
import './FolderPhotosModal.css';

/**
 * Folder Photos Modal Component
 * Enhanced photo viewer with grid layout and file details
 */
const FolderPhotosModal = ({ isOpen, folder, onClose }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isOpen && folder) {
      loadPhotos();
    }
  }, [isOpen, folder]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const response = await getFolderPhotos(folder.id, folder.name, folder.event_id);
      setPhotos(response.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return { short: 'Unknown', full: 'No date available' };
    const date = new Date(dateStr);
    
    const shortFormat = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const fullFormat = date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return { short: shortFormat, full: fullFormat };
  };

  if (!isOpen || !folder) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="photo-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="photo-modal-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="photo-modal-header">
            <div>
              <h3 className="photo-modal-title">
                {folder.name}
              </h3>
              <div className="photo-modal-subtitle">
                <span>📸 {photos.length} photos</span>
                <span style={{ margin: '0 1rem' }}>•</span>
                <span>👤 {folder.photographer_name || 'Unknown'}</span>
                <span style={{ margin: '0 1rem' }}>•</span>
                <span>📅 {formatDate(folder.upload_date).short}</span>
              </div>
            </div>
            
            <button 
              className="photo-modal-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          
          {/* Photos Grid */}
          <div className="photo-modal-grid-container">
            {loading ? (
              <div className="photo-modal-loading">
                Loading photos...
              </div>
            ) : photos.length > 0 ? (
              <div className="photo-modal-grid">
                {photos.map(photo => (
                  <PhotoCard 
                    key={photo.id} 
                    photo={photo}
                    onClick={() => setSelectedPhoto(photo)}
                  />
                ))}
              </div>
            ) : (
              <div className="photo-modal-empty">
                No photos found in this folder.
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Full Size Photo Viewer */}
        {selectedPhoto && (
          <FullSizePhotoModal 
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Photo Card Component
 * Individual photo with thumbnail and metadata
 */
const PhotoCard = ({ photo, onClick }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  };

  const photoUrl = getPhotoUrl(photo.file_path);

  return (
    <motion.div
      className="photo-card"
      whileHover={{
        scale: 1.05,
        borderColor: 'rgba(139, 92, 246, 0.5)',
        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
      }}
      onClick={onClick}
    >
      {/* Photo Thumbnail */}
      <div className="photo-thumbnail-container">
        <img 
          className="photo-thumbnail"
          src={photoUrl}
          alt={photo.filename}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML += '<div class="photo-thumbnail-placeholder">📷</div>';
          }}
        />
      </div>
      
      {/* Photo Info */}
      <div className="photo-info">
        <div className="photo-filename">
          {photo.filename}
        </div>
        
        {/* Upload Date and Time */}
        {photo.upload_date && (
          <div className="photo-datetime">
            <span>📅 {new Date(photo.upload_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}</span>
            <span>•</span>
            <span className="photo-datetime-time">
              🕐 {new Date(photo.upload_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        )}
        
        <div className="photo-metadata">
          <span>{formatFileSize(photo.file_size)}</span>
          {photo.width && photo.height && (
            <span>{photo.width}×{photo.height}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Full Size Photo Modal
 * Shows photo in full size
 */
const FullSizePhotoModal = ({ photo, onClose }) => {
  const photoUrl = getPhotoUrl(photo.file_path);

  return (
    <motion.div
      className="fullsize-photo-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button 
        className="fullsize-photo-close"
        onClick={onClose}
      >
        ✕
      </button>
      
      <img 
        className="fullsize-photo-image"
        src={photoUrl}
        alt={photo.filename}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="fullsize-photo-info">
        <div className="fullsize-photo-filename">
          {photo.filename}
        </div>
        
        {/* Upload Date and Time in Full Size Modal */}
        {photo.upload_date && (
          <div className="fullsize-photo-datetime">
            <span>📅 Uploaded:</span>
            <span>
              {new Date(photo.upload_date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            <span>at</span>
            <span style={{ fontFamily: 'monospace' }}>
              {new Date(photo.upload_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        )}
        
        <div className="fullsize-photo-meta">
          {photo.width && photo.height && `${photo.width}×${photo.height} • `}
          {photo.file_size && formatFileSize(photo.file_size)}
        </div>
      </div>
    </motion.div>
  );
  
  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  }
};

export default FolderPhotosModal;
