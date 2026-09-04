import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Training Analytics Component
 * Displays analytics dashboard with training metrics
 */
const TrainingAnalytics = ({ metrics, eventId = 1, onRefresh }) => {
  const navigate = useNavigate();

  const viewClusters = () => {
    navigate(`/clusters/${eventId}`);
  };

  // Check if we have identities to determine if there are clusters to view
  const hasIdentities = metrics?.uniqueIdentities > 0 || metrics?.unique_identities > 0;

  return (
    <motion.div 
      className="system-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">
          <span className="card-title-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="M18 17V9"></path>
              <path d="M13 17V5"></path>
              <path d="M8 17v-3"></path>
            </svg>
          </span>
          Training Analytics Dashboard
        </h3>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="refresh-button"
            title="Refresh stats"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh
          </button>
        )}
      </div>
      
      <div className="card-content">
        <div className="metrics-grid">
          <MetricCard 
            title="Total Photographs Processed"
            value={metrics.totalPhotos || metrics.total_photos || '—'}
          />
          <MetricCard 
            title="Total Faces Detected"
            value={metrics.totalFaces || metrics.total_faces || '—'}
          />
          <MetricCard 
            title="Total Unique Identities"
            value={metrics.uniqueIdentities || metrics.unique_identities || '—'}
            clickable={hasIdentities}
            onClick={hasIdentities ? viewClusters : null}
            hoverText={hasIdentities ? "Click to view groups" : ""}
          />
          <MetricCard 
            title="Training Completion Status"
            value={metrics.completionStatus || metrics.completion_status || '—'}
          />
          <MetricCard 
            title="Last Training Timestamp"
            value={
              metrics.lastTrainingTimestamp || metrics.last_training_timestamp
                ? new Date(metrics.lastTrainingTimestamp || metrics.last_training_timestamp).toLocaleString() 
                : '—'
            }
          />
        </div>
        
        {hasIdentities && (
          <div style={{ 
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button 
              onClick={viewClusters}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                color: 'white',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View All Face Clusters
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Individual Metric Card Component
 */
const MetricCard = ({ title, value, clickable = false, onClick, hoverText = "" }) => {
  const cardStyle = clickable ? {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative'
  } : {};
  
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <div 
      className="metric-card" 
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="metric-title">{title}</div>
      <div 
        className="metric-value"
        style={clickable ? {
          color: '#667eea',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: '4px',
          cursor: 'pointer'
        } : {}}
      >
        {value}
      </div>
      
      {clickable && isHovered && hoverText && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          zIndex: 10,
          marginTop: '5px'
        }}>
          {hoverText}
        </div>
      )}
    </div>
  );
};

export default TrainingAnalytics;
