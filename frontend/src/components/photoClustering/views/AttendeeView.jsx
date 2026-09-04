import React from 'react';
import { motion } from 'framer-motion';
import { formatEventDate } from '../../../utils/eventService';
import { attendeeData } from '../sampleData';

/**
 * Attendee View Component
 * Dashboard for event attendees to view and download their photos
 */
const AttendeeView = ({
  userData,
  viewingOwnPhotos,
  isDownloading,
  photos,
  onViewPhotos,
  onBackToProfile,
  onDownload
}) => {
  return (
    <div className="system-content">
      {/* Profile Card */}
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </span>
          Welcome, {userData.name}
        </h3>
        
        <div className="card-content">
          <div className="profile-section">
            <div className="profile-image">
              <img src={userData.profilePhoto || attendeeData.profilePhoto} alt="Profile" />
            </div>
            <div className="event-details">
              <h3>{attendeeData.events[0].name}</h3>
              <p className="event-date">{formatEventDate(attendeeData.events[0].date)}</p>
              <p className="event-location">{attendeeData.events[0].location}</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* My Photos Card */}
      {!viewingOwnPhotos ? (
        <PhotosOverviewCard 
          matchedPhotos={attendeeData.events[0].matchedPhotos}
          totalPhotos={attendeeData.events[0].totalPhotos}
          onViewPhotos={onViewPhotos}
        />
      ) : (
        <PhotosGridCard 
          photos={photos}
          isDownloading={isDownloading}
          onBack={onBackToProfile}
          onDownload={onDownload}
        />
      )}
    </div>
  );
};

/**
 * Photos Overview Card
 * Shows count of matched photos and button to view them
 */
const PhotosOverviewCard = ({ matchedPhotos, totalPhotos, onViewPhotos }) => {
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
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        My Photos
      </h3>
      
      <div className="card-content">
        <p className="photo-count-info">
          There are <strong>{matchedPhotos} photos of you</strong> out of <strong>{totalPhotos} total event photos</strong>.
        </p>
        
        <div className="system-cta">
          <button 
            className="cta-button"
            onClick={onViewPhotos}
          >
            <span>View My Photos</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Photos Grid Card
 * Shows grid of photos with back and download buttons
 */
const PhotosGridCard = ({ photos, isDownloading, onBack, onDownload }) => {
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
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        My Photos
      </h3>
      
      <div className="card-content">
        <div className="photos-actions-bar">
          <button 
            className="hero-button secondary"
            onClick={onBack}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </button>
          <button 
            className="hero-button tertiary"
            onClick={onDownload}
            disabled={isDownloading}
          >
            <span>{isDownloading ? 'Downloading...' : 'Download My Photos'}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
        
        <div className="photos-grid">
          {photos.map(photo => (
            <div key={photo.id} className="photo-item">
              <img src={photo.url} alt={photo.title} />
              <div className="photo-title">{photo.title}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AttendeeView;
