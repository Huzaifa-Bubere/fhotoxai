import React from 'react';
import { motion } from 'framer-motion';

/**
 * Active Trainings Component
 * Displays all currently running and queued training jobs
 */
const ActiveTrainings = ({ trainings }) => {
  if (!trainings || trainings.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="system-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <h3 className="card-title">
        <span className="card-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </span>
        Active Trainings ({trainings.length})
      </h3>
      
      <div className="card-content">
        <div className="active-trainings-list">
          {trainings.map(training => (
            <TrainingItem key={training.id} training={training} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Individual Training Item Component
 */
const TrainingItem = ({ training }) => {
  return (
    <div className="training-item">
      <div className="training-header">
        <h4 className="training-event-name">{training.eventName}</h4>
        <span className={`training-status-badge ${training.status}`}>
          {training.status === 'in_progress' ? 'In Progress' : 'Queued'}
        </span>
      </div>
      
      <div className="training-details">
        <div className="training-stat">
          <span className="stat-label">Progress:</span>
          <span className="stat-value">{training.progress}%</span>
        </div>
        <div className="training-stat">
          <span className="stat-label">Photos Processed:</span>
          <span className="stat-value">{training.photosProcessed} / {training.totalPhotos}</span>
        </div>
        {training.facesDetected > 0 && (
          <div className="training-stat">
            <span className="stat-label">Faces Detected:</span>
            <span className="stat-value">{training.facesDetected}</span>
          </div>
        )}
        {training.startedAt && (
          <div className="training-stat">
            <span className="stat-label">Started:</span>
            <span className="stat-value">
              {new Date(training.startedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      
      {training.status === 'in_progress' && training.progress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${training.progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ActiveTrainings;
