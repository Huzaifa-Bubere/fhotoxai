import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FaceRecognitionDemo from './FaceRecognitionDemo';

const Demo = ({ activeDemoType = '' }) => {
  const [selectedDemo, setSelectedDemo] = useState(activeDemoType || null);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If activeDemoType changes and is not empty, update selectedDemo
    if (activeDemoType && activeDemoType !== selectedDemo) {
      setSelectedDemo(activeDemoType);
    }
  }, [activeDemoType, selectedDemo]);

  useEffect(() => {
    const callApi = async () => {
      try {
        // Use a mock response instead of trying to connect to an API
        setApiResponse({
          status: "online",
          message: "All Demos Ready"
        });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (!selectedDemo) {
      callApi();
    }
  }, [selectedDemo]);

  const handleClose = () => {
    setSelectedDemo(null);
  };

  const demos = [
    {
      id: 'face-recognition',
      title: 'Face Recognition',
      description: 'Experience real-time face detection and recognition using your webcam',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      component: <FaceRecognitionDemo onClose={handleClose} />
    },
    {
      id: 'face-clustering',
      title: 'Face Clustering',
      description: 'See how our system groups similar faces from large collections of photos',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3"></circle>
          <circle cx="6" cy="6" r="3"></circle>
          <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
          <line x1="6" y1="9" x2="6" y2="21"></line>
        </svg>
      ),
      component: (
        <div className="demo-placeholder">
          <div className="placeholder-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Face Clustering Demo</h3>
            <p>This demo will be available soon</p>
          </div>
        </div>
      )
    }
  ];

  if (selectedDemo) {
    const demo = demos.find(d => d.id === selectedDemo);
    
    return (
      <div className="demo-fullscreen">
        <button className="demo-close-button" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Close Demo</span>
        </button>
        {demo.component}
      </div>
    );
  }

  return (
    <div className="demo-container">
      <motion.div 
        className="demo-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="demo-title">Interactive Demos</h2>
        <p className="demo-subtitle">
          Experience our AI systems in action with these interactive demos
        </p>
        <div className="demo-status">
          {loading ? (
            <span className="status-loading">Connecting...</span>
          ) : error ? (
            <span className="status-error">Error: {error}</span>
          ) : (
            <span className="status-online">
              <span className="status-dot"></span>
              {apiResponse?.message}
            </span>
          )}
        </div>
      </motion.div>

      <div className="demo-options">
        {demos.map((demo, index) => (
          <motion.div
            key={demo.id}
            className="demo-option"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            onClick={() => setSelectedDemo(demo.id)}
          >
            <div className="demo-option-icon">
              {demo.icon}
            </div>
            <div className="demo-option-content">
              <h3 className="demo-option-title">{demo.title}</h3>
              <p className="demo-option-description">{demo.description}</p>
            </div>
            <button className="demo-option-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="demo-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <p>Select any demo above to see our AI vision systems in action</p>
      </motion.div>
    </div>
  );
};

export default Demo;