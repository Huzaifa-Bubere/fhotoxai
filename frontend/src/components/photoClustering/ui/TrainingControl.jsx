import React from 'react';
import { motion } from 'framer-motion';

/**
 * Training Control Component
 * Allows admin to start training and view training status
 */
const TrainingControl = ({ 
  isTraining, 
  trainingMetrics, 
  onStartTraining
}) => {
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
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </span>
        Extract Faces
      </h3>
      
      <div className="card-content">
        {!isTraining ? (
          <div className="system-cta">
            <button 
              className="cta-button"
              onClick={onStartTraining}
            >
              <span>Train</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        ) : (
          <div className="training-notification">
            <p>Training has started. You will be notified once it's done.</p>
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ width: trainingMetrics.completionStatus }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TrainingControl;
