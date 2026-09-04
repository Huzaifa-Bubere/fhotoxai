import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

import FaceThumbnail from './FaceThumbnail';

const DetectedFaceCard = ({ face }) => {
  const linkTarget = face.cluster_id ? `/cluster/${face.cluster_id}` : null;

  const content = (
    <>
      <div style={{
        aspectRatio: '1',
        width: '100%',
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <FaceThumbnail
          key={face.id}
          face={face}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          background: 'rgba(0, 0, 0, 0.6)',
          color: '#fff',
          padding: '0.2rem 0.6rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          backdropFilter: 'blur(4px)'
        }}>
          1 face
        </div>
      </div>

      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        <h3 style={{
          margin: 0,
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#1E293B',
          lineHeight: 1.3,
          wordBreak: 'break-word'
        }}>
          {face.cluster_name || `Face ${face.id}`}
        </h3>

        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Face ID: {face.id}
        </div>

        <div style={{
          marginTop: 'auto',
          fontSize: '0.75rem',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <Camera size={12} />
          Confidence {Number(face.confidence || 0).toFixed(1)}%
        </div>
      </div>
    </>
  );

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    transition: 'all 0.2s ease',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit'
  };

  return (
    <motion.div whileHover={{ y: -4 }}>
      {linkTarget ? (
        <Link to={linkTarget} style={cardStyle}>
          {content}
        </Link>
      ) : (
        <div style={cardStyle}>
          {content}
        </div>
      )}
    </motion.div>
  );
};

export default DetectedFaceCard;
