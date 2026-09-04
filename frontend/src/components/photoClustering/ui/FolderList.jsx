import React from 'react';
import { motion } from 'framer-motion';
import { formatEventDate } from '../../../utils/eventService';
import './FolderList.css';

/**
 * Folder List Component
 * Displays list of photo folders with expandable subfolders
 */
const FolderList = ({ 
  folders, 
  expandedFolders, 
  onToggleFolder, 
  onViewPhotos 
}) => {
  return (
    <motion.div 
      className="system-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <h3 className="card-title">
        <span className="card-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4l2 3h8a2 2 0 012 2v11a2 2 0 01-2 2z"></path>
          </svg>
        </span>
        Photos
      </h3>
      
      <div className="card-content">
        <div className="folder-list">
          {folders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              isExpanded={expandedFolders[folder.id]}
              onToggle={() => onToggleFolder(folder.id)}
              onViewPhotos={onViewPhotos}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Individual Folder Item Component
 */
const FolderItem = ({ folder, isExpanded, onToggle, onViewPhotos }) => {
  
  // Enhanced date formatting function
  const formatDetailedDate = (dateStr) => {
    if (!dateStr) return { display: 'Unknown date', detail: 'No date available' };
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Format for display
    let display;
    if (diffHours < 24) display = `Today`;
    else if (diffDays === 1) display = `Yesterday`;
    else if (diffDays < 7) display = `${diffDays} days ago`;
    else display = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Full detail
    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const fullTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return {
      display,
      detail: `${fullDate} at ${fullTime}`,
      dateOnly: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeOnly: fullTime
    };
  };
  
  const dateInfo = formatDetailedDate(folder.upload_date || folder.date);
  
  return (
    <div className="folder-item">
      <div className="folder-header" onClick={onToggle}>
        <div className="folder-main-info">
          <span className="folder-name">{folder.name}</span>
          <span className="folder-info">
            {dateInfo.display} • {folder.totalPhotos || folder.photo_count || 0} photos
          </span>
        </div>
        <div className="folder-datetime">
          <div className="datetime-compact">
            <span className="date-part">📅 {dateInfo.dateOnly}</span>
            <span className="time-part">🕐 {dateInfo.timeOnly}</span>
          </div>
        </div>
        <span className={`folder-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      
      {isExpanded && (
        <div className="folder-details">
          {/* Show full date/time details when expanded */}
          <div className="folder-datetime-detail">
            <p className="datetime-full">
              📅 <strong>Uploaded:</strong> {dateInfo.detail}
            </p>
          </div>
          
          <div className="subfolder-list">
            {folder.subfolders && folder.subfolders.map(subfolder => (
              <div key={subfolder.id} className="subfolder-item">
                <div className="subfolder-main">
                  <span className="subfolder-name">{subfolder.name}</span>
                  <span className="photo-count">{subfolder.photoCount} photos</span>
                </div>
                <div className="subfolder-meta">
                  {subfolder.upload_date && (
                    <span className="subfolder-time">
                      🕐 {new Date(subfolder.upload_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  )}
                  <button 
                    className="view-photos-btn"
                    onClick={(e) => onViewPhotos(subfolder.id, e)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="folder-actions">
            <button 
              className="view-all-photos-btn"
              onClick={(e) => onViewPhotos(folder.id, e)}
            >
              View All Photos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderList;
