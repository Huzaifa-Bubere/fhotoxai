import React, { useRef } from 'react';
import { motion } from 'framer-motion';

const Hero = ({ toggleDemo }) => {
  const videoRef = useRef(null);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="hero">
      {/* Clean, modern backdrop */}
      <div className="hero-backdrop">
        <div className="backdrop-gradient"></div>
        <div className="backdrop-grid"></div>
      </div>
      
      <div className="container">
        <div className="hero-content">
          <motion.div 
            className="hero-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero-title"
            >
              AI Vision <span className="highlight">Architecture</span>
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hero-subtitle"
            >
              Secure, privacy-aware computer vision systems for real-world applications
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="hero-description"
            >
              Modern AI vision systems architected using modular inference pipelines,
              secure processing boundaries, and privacy-first data handling.
            </motion.p>
            
            <motion.div 
              className="hero-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <button onClick={toggleDemo} className="hero-button primary">
                <span>Try Demo</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M10 8l6 4-6 4V8z"></path>
                </svg>
              </button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="hero-right"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="hero-visual">
              <motion.div 
                className="visual-element"
                animate={{ 
                  rotateZ: [0, 360]
                }}
                transition={{ 
                  duration: 30, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                <svg className="rotating-element" width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="200" cy="200" r="180" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="1" fill="none" />
                  <circle cx="200" cy="200" r="140" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" fill="none" />
                  <circle cx="200" cy="200" r="100" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" fill="none" />
                </svg>
              </motion.div>
              
              <motion.div 
                className="visual-element network"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                <div className="node node1"></div>
                <div className="node node2"></div>
                <div className="node node3"></div>
                <div className="node node4"></div>
                <div className="connection connection1"></div>
                <div className="connection connection2"></div>
                <div className="connection connection3"></div>
                
                <motion.div 
                  className="pulse-circle"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.7, 0, 0.7]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="hero-scroll-indicator">
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            y: { duration: 0.5, delay: 1.2 },
            opacity: { duration: 0.5, delay: 1.2 },
          }}
          className="scroll-text"
        >
          Scroll to explore
        </motion.div>
        <motion.svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            y: { duration: 0.5, delay: 1.3 },
            opacity: { duration: 0.5, delay: 1.3 },
          }}
        >
          <path d="M7 13l5 5 5-5"></path>
        </motion.svg>
      </div>
    </div>
  );
};

export default Hero;