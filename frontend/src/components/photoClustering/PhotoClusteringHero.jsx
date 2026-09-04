import React from 'react';
import { motion } from 'framer-motion';

/**
 * Hero Section Component
 * Displays page title, description, and login/logout buttons
 */
const PhotoClusteringHero = ({ activeUser, onRoleLogin, onLogout }) => {
  return (
    <section className="model-hero">
      <div className="model-hero-content container">
        <motion.div
          className="model-badge"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Event Photography System
        </motion.div>
        <motion.h1
          className="model-hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Photo Clustering
        </motion.h1>
        <motion.p
          className="model-hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Privacy-first, ML-powered photo distribution system
        </motion.p>

        {/* Login Buttons in Hero Section */}
        {!activeUser && (
          <motion.div
            className="hero-login-buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              className="hero-button primary"
              onClick={() => onRoleLogin('photographer')}
            >
              <span className="button-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </span>
              Photographer Login
            </button>

            <button
              className="hero-button primary"
              onClick={() => onRoleLogin('attendee')}
            >
              <span className="button-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              Attendee Login
            </button>

            <button
              className="hero-button primary"
              onClick={() => onRoleLogin('admin')}
            >
              <span className="button-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </span>
              Event Manager Login
            </button>
          </motion.div>
        )}

        {/* Show logout button when user is logged in */}
        {activeUser && (
          <motion.div
            className="hero-logout-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              className="hero-button secondary"
              onClick={onLogout}
            >
              <span className="button-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </span>
              Logout
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PhotoClusteringHero;
