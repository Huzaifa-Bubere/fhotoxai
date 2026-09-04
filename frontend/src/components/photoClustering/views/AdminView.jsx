import React from 'react';
import { useNavigate } from 'react-router-dom';
import ActiveTrainings from '../ui/ActiveTrainings';
import TrainingControl from '../ui/TrainingControl';
import TrainingAnalytics from '../ui/TrainingAnalytics';
import PhotoBrowser from '../ui/PhotoBrowser';

/**
 * Admin View Component
 * Dashboard for administrators to manage training and view analytics
 */
const AdminView = ({
  activeTrainings,
  isTraining,
  trainingMetrics,
  onStartTraining,
  onRefreshStats,
  folders,
  totalPhotos,
  onViewFolder,
  onDeleteFolder,
  isFoldersLoading,
  eventId = 1
}) => {
  const navigate = useNavigate();
  
  const viewClusters = () => {
    navigate(`/clusters/${eventId || 1}`);
  };

  return (
    <div className="system-content">
      {/* Active Trainings Section */}
      <ActiveTrainings trainings={activeTrainings} />
      
      {/* Training Control Section */}
      <TrainingControl 
        isTraining={isTraining}
        trainingMetrics={trainingMetrics}
        onStartTraining={onStartTraining}
      />
      
      {/* View Clusters Button */}
      <ClusterViewButton 
        onClick={viewClusters} 
        uniqueIdentities={trainingMetrics?.uniqueIdentities || trainingMetrics?.unique_identities || 0} 
      />
      
      {/* Training Analytics Section */}
      <TrainingAnalytics 
        metrics={trainingMetrics} 
        onRefresh={onRefreshStats}
        eventId={eventId}
      />
      
      {/* Photo Browser Section - NEW */}
      <PhotoBrowser 
        folders={folders}
        totalPhotos={totalPhotos}
        onViewFolder={onViewFolder}
        onDeleteFolder={onDeleteFolder}
        isLoading={isFoldersLoading}
      />
    </div>
  );
};

/**
 * Cluster View Button Component
 * Button that navigates to the face clusters view
 */
const ClusterViewButton = ({ onClick, uniqueIdentities }) => {
  return (
    <div 
      className="system-card"
      style={{
        background: 'linear-gradient(135deg, rgba(248, 250, 255, 0.97) 0%, rgba(241, 243, 255, 0.97) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '1.75rem',
        padding: '1.5rem',
        boxShadow: '0 6px 18px rgba(99, 102, 241, 0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: '#1E293B'
          }}>
            View Face Clusters
          </h3>
          <p style={{
            margin: '0',
            fontSize: '0.875rem',
            color: '#64748B'
          }}>
            {uniqueIdentities > 0 
              ? `${uniqueIdentities} unique identities have been detected` 
              : 'View detected face clusters after training completes'}
          </p>
        </div>
        <button 
          onClick={onClick}
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 15px rgba(99, 102, 241, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.25)';
          }}
        >
          View Groups
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AdminView;
