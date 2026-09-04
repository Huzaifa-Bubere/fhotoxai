import React from 'react';
import { motion } from 'framer-motion';
import './PhotoBrowser.css';

/**
 * Photo Browser Component
 * Shows uploaded photo folders with stats for admin view
 */
const PhotoBrowser = ({ folders, totalPhotos, onViewFolder, onDeleteFolder, isLoading }) => {
  const totalFolders = folders?.length || 0;
  const totalCount = totalPhotos || folders?.reduce((sum, f) => sum + (f.photo_count || 0), 0) || 0;
  
  return (
    <motion.div 
      className="system-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <h3 className="card-title">
        <span className="card-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
          </svg>
        </span>
        Uploaded Photos
      </h3>
      
      <div className="card-content">
        {/* Photo Statistics */}
        <div className="photo-stats">
          <div className="stat">
            <div className="stat-value" style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#667eea',
              textShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
            }}>
              {totalFolders}
            </div>
            <div className="stat-label" style={{
              fontSize: '0.875rem',
              color: '#64748B',
              marginTop: '0.25rem'
            }}>
              Upload Batches
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-value" style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#EC4899',
              textShadow: '0 2px 4px rgba(236, 72, 153, 0.2)'
            }}>
              {totalCount}
            </div>
            <div className="stat-label" style={{
              fontSize: '0.875rem',
              color: '#64748B',
              marginTop: '0.25rem'
            }}>
              Total Photos
            </div>
          </div>
        </div>
        
        {/* Folders List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
            Loading folders...
          </div>
        ) : folders && folders.length > 0 ? (
          <div className="folders-list">
            {folders.map(folder => (
                <FolderCard 
                  key={folder.id}
                  folder={folder}
                  onClick={() => onViewFolder(folder)}
                  onDeleteFolder={onDeleteFolder}
                />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#64748B',
            fontStyle: 'italic'
          }}>
            No photos uploaded yet. Photographers can upload folders above.
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Folder Card Component
 * Individual folder display with metadata
 */
const FolderCard = ({ folder, onClick, onDeleteFolder }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return { relative: 'Unknown', full: 'Unknown date' };
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let relative;
    if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = date.toLocaleDateString();
    
    // Full date and time
    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const fullTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return {
      relative,
      full: `${fullDate} at ${fullTime}`,
      dateOnly: fullDate,
      timeOnly: fullTime
    };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  };

  const dateInfo = formatDate(folder.upload_date);

  return (
    <motion.div
      className="folder-card"
      whileHover={{
        scale: 1.02,
        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.1)',
        borderColor: 'rgba(99, 102, 241, 0.3)'
      }}
      onClick={onClick}
    >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}>
              📁
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1E293B',
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {folder.name}
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.875rem',
                color: '#475569'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>📸 {folder.photo_count || folder.totalPhotos} photos</span>
                  <span>👤 {folder.photographer_name || 'Unknown'}</span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.125rem',
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📅</span>
                    <span style={{ fontWeight: '500' }}>{dateInfo.dateOnly}</span>
                    <span>🕐</span>
                    <span style={{ fontWeight: '500', fontFamily: 'monospace' }}>{dateInfo.timeOnly}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🕒</span>
                    <span style={{ fontStyle: 'italic' }}>{dateInfo.relative}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="view-photos-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              View Photos
            </button>
            
            {onDeleteFolder && (
              <button 
                className="delete-folder-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
    </motion.div>
  );
};

export default PhotoBrowser;
