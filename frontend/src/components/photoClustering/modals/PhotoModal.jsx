import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Photo Viewing Modal Component
 * Modal overlay for viewing photos in a folder
 */
const PhotoModal = ({ isOpen, folderId, photos, onClose }) => {
  if (!isOpen || !folderId) return null;

  const folderPhotos = photos[folderId] || [];

  return (
    <AnimatePresence>
      <motion.div 
        className="demo-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="demo-container">
          <button className="close-demo" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="demo-content">
            <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>
              Viewing Photos: {folderId}
            </h3>
            <div className="photos-grid">
              {folderPhotos.length > 0 ? (
                folderPhotos.map(photo => (
                  <div key={photo.id} className="photo-item">
                    <img src={photo.url} alt={photo.title} />
                    <div className="photo-title">{photo.title}</div>
                  </div>
                ))
              ) : (
                <p>No photos found in this folder.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PhotoModal;
