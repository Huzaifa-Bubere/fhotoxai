import React from 'react';
import { motion } from 'framer-motion';

/**
 * Welcome Card Component
 * Displays system introduction and features when user is not logged in
 */
const WelcomeCard = () => {
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
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        </span>
        Welcome to Photo Clustering System
      </h3>
      
      <div className="card-content">
        <p className="card-text" style={{ marginBottom: '1.5rem' }}>
          Our AI-powered photo distribution system uses advanced face clustering to automatically 
          organize event photos and deliver personalized photo collections to attendees.
        </p>
        
        <div className="feature-highlights">
          <FeatureItem 
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', marginRight: '12px', color: '#6366F1' }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            }
            title="Privacy-First"
            description="All processing happens securely on our servers"
          />
          <FeatureItem 
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', marginRight: '12px', color: '#EC4899' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            }
            title="Fast Processing"
            description="ML-powered face detection and clustering"
          />
          <FeatureItem 
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', marginRight: '12px', color: '#14B8A6' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            }
            title="Automatic Distribution"
            description="Attendees get their photos instantly"
          />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Feature Item Component
 */
const FeatureItem = ({ icon, title, description }) => {
  return (
    <div className="feature-item">
      {icon}
      <span><strong>{title}:</strong> {description}</span>
    </div>
  );
};

export default WelcomeCard;
