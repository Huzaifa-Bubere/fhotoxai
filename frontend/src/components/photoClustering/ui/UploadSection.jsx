import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../../../context/ToastContext';
import './UploadSection.css';

/**
 * Upload Section Component
 * Handles folder upload functionality for photographers with live progress tracking
 */
const UploadSection = ({
  isProcessing,
  showSuccess,
  uploadResults,
  fileInputRef,
  onUpload,
  activeUploads = []
}) => {

  // State for current time (updates every second)
  const [currentTime, setCurrentTime] = useState(new Date());
  const [buttonHovered, setButtonHovered] = useState(false);
  const { addToast } = useToast();

  // Handle file upload button click with debugging
  const handleUploadClick = (e) => {
    console.log('=== Upload button clicked ===');
    console.log('Event:', e);
    console.log('Event target:', e.target);
    console.log('Event currentTarget:', e.currentTarget);
    console.log('FileInputRef exists:', !!fileInputRef);
    console.log('FileInputRef.current exists:', !!fileInputRef?.current);
    console.log('isProcessing:', isProcessing);

    if (!fileInputRef || !fileInputRef.current) {
      console.error('File input ref is not available!');

      // Fallback: Try to get input by ID
      const input = document.getElementById('folder-upload');
      if (input) {
        console.log('Using fallback: document.getElementById');
        input.click();
        input.click();
      } else {
        console.error('Could not find file input element at all!');
        addToast('Upload button error. Please refresh the page and try again.', 'error');
      }
      return;
    }

    try {
      fileInputRef.current.click();
      console.log('File input click triggered successfully');
    } catch (error) {
      console.error('Error clicking file input:', error);
      addToast('Failed to open file picker. Error: ' + error.message, 'error');
    }
  };

  const handleButtonMouseEnter = () => {
    console.log('Button mouse enter detected');
    setButtonHovered(true);
  };

  const handleButtonMouseLeave = () => {
    console.log('Button mouse leave detected');
    setButtonHovered(false);
  };

  // Update current time every second when there's an active upload
  const currentUpload = activeUploads.find(upload => upload.status === 'in_progress');

  useEffect(() => {
    let interval;
    if (currentUpload) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000); // Update every second
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUpload]);

  useEffect(() => {
    if (showSuccess && uploadResults && !currentUpload) {
      addToast('Upload Completed Successfully!', 'success');
    }
  }, [showSuccess, uploadResults, currentUpload, addToast]);

  // Format current date and time
  const getCurrentDateTime = () => {
    return {
      date: currentTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };
  };

  // Format upload start time
  const formatStartTime = (startedAt) => {
    if (!startedAt) return null;
    const startTime = new Date(startedAt);
    return {
      date: startTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      time: startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };
  };

  const currentDateTime = getCurrentDateTime();
  const startDateTime = currentUpload ? formatStartTime(currentUpload.startedAt) : null;

  return (
    <motion.div
      className="system-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <h3 className="card-title">
        <span className="card-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </span>
        Upload Photos
      </h3>

      <div className="card-content">
        <p className="card-text">Select a folder of photographs to upload:</p>
        <input
          type="file"
          id="folder-upload"
          webkitdirectory=""
          directory=""
          multiple
          onChange={onUpload}
          disabled={isProcessing}
          ref={fileInputRef}
          style={{ display: 'none' }}
          data-testid="folder-upload-input"
        />
        <button
          className="cta-button"
          onClick={handleUploadClick}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          disabled={isProcessing}
          type="button"
          data-testid="upload-button"
          style={{
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 10,
            border: buttonHovered ? '2px solid #3b82f6' : undefined,
            boxShadow: buttonHovered ? '0 0 10px rgba(59, 130, 246, 0.5)' : undefined
          }}
        >
          <span>{isProcessing ? 'Uploading...' : 'Upload Photo Folder'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Live Upload Progress */}
        {currentUpload && (
          <div className="upload-progress">
            <h4>🚀 Upload in Progress</h4>

            {/* Date and Time Display */}
            <div className="upload-datetime">
              <div className="datetime-section">
                <span className="datetime-label">📅 Today:</span>
                <span className="datetime-value">{currentDateTime.date}</span>
              </div>
              <div className="datetime-section">
                <span className="datetime-label">🕐 Current Time:</span>
                <span className="datetime-value">{currentDateTime.time}</span>
              </div>
              {startDateTime && (
                <div className="datetime-section">
                  <span className="datetime-label">🚀 Started At:</span>
                  <span className="datetime-value">{startDateTime.date} {startDateTime.time}</span>
                </div>
              )}
            </div>

            <div className="upload-main-stat">
              <span className="main-stat-label">Photos Processed:</span>
              <span className="main-stat-value">{currentUpload.photosProcessed} / {currentUpload.totalPhotos}</span>
            </div>

            <div className="upload-stats">
              <div className="upload-stat">
                <span className="stat-label">✅ Successfully Uploaded:</span>
                <span className="stat-value success">{currentUpload.photosUploaded}</span>
              </div>
              {currentUpload.photosFailed > 0 && (
                <div className="upload-stat">
                  <span className="stat-label">❌ Failed:</span>
                  <span className="stat-value error">{currentUpload.photosFailed}</span>
                </div>
              )}
              <div className="upload-stat">
                <span className="stat-label">📁 Folder:</span>
                <span className="stat-value folder-name">{currentUpload.folderName}</span>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${currentUpload.progress}%` }}
                >
                  <div className="progress-shine"></div>
                </div>
              </div>
              <p className="progress-text">
                <strong>{currentUpload.progress}% complete</strong>
              </p>
            </div>

            {/* Upload Speed Info */}
            <div className="upload-info">
              <p className="upload-details">
                ⏱️ Processing {currentUpload.photosProcessed} of {currentUpload.totalPhotos} photos...
              </p>
            </div>
          </div>
        )}

        {/* Upload Success Results */}
        {showSuccess && uploadResults && !currentUpload && (
          <div className="upload-success">
            <h4>✅ Upload Completed Successfully!</h4>
            <div className="success-datetime">
              <p className="success-timestamp">
                📅 Completed on: {currentDateTime.date}<br />
                🕐 At: {currentDateTime.time}
              </p>
            </div>
            <p className="success-summary">
              Uploaded {uploadResults.uploaded} of {uploadResults.total} files.
              {uploadResults.failed > 0 && ` (${uploadResults.failed} failed)`}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UploadSection;
