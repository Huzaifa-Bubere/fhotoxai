import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FaceThumbnail from './FaceThumbnail';
import { updateClusterName } from '../../../utils/photoClusteringApi';
import { motion } from 'framer-motion';
import { Edit2, Check, X, User } from 'lucide-react';

/**
 * ClusterCard Component
 * 
 * Displays a card for a face cluster with ONE representative face thumbnail,
 * name editing functionality, and shows total face count.
 * 
 * @param {Object} props
 * @param {Object} props.cluster - Cluster data with id, name, sample_faces (contains one representative face), and total_faces
 * @param {Function} props.onClusterUpdated - Callback for when cluster name is updated
 */
const ClusterCard = ({ cluster, onClusterUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(cluster.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Display only the first (representative) face
  const representativeFace = cluster.sample_faces && cluster.sample_faces.length > 0
    ? cluster.sample_faces[0]
    : null;

  // Start editing the cluster name
  const startEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  // Save the updated cluster name
  const saveClusterName = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (newName.trim() === cluster.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateClusterName(cluster.id, newName.trim());
      if (result.success) {
        // Update local state and notify parent
        const updatedCluster = { ...cluster, name: newName.trim() };
        if (onClusterUpdated) {
          onClusterUpdated(updatedCluster);
        }
      }
    } catch (error) {
      console.error('Failed to update cluster name:', error);
      // Revert to original name on error
      setNewName(cluster.name);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  // Cancel editing
  const cancelEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setNewName(cluster.name);
    setIsEditing(false);
  };

  // Handle input change for name field
  const handleNameChange = (e) => {
    setNewName(e.target.value);
  };

  return (
    <motion.div
      className="cluster-card"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: isHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <Link to={`/cluster/${cluster.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
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
          {representativeFace ? (
            <FaceThumbnail key={representativeFace.id} face={representativeFace} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <User size={32} />
            </div>
          )}

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
            {cluster.total_faces} photos
          </div>
        </div>

        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                value={newName}
                onChange={handleNameChange}
                placeholder="Person name"
                autoFocus
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  border: '1px solid #6366F1',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  fontWeight: '500',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)'
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={saveClusterName}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    background: '#6366F1',
                    color: '#fff',
                    border: 'none',
                    padding: '0.3rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  <Check size={12} style={{ marginRight: '4px' }} /> Save
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    padding: '0.3rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  <X size={12} style={{ marginRight: '4px' }} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <h3 style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#1E293B',
                lineHeight: 1.3,
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {cluster.name}
              </h3>
              <button
                onClick={startEditing}
                aria-label="Edit name"
                title="Edit name"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.15rem',
                  color: '#94A3B8',
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#6366F1'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}

          <div style={{
            fontSize: '0.7rem',
            color: '#94A3B8',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>ID: {cluster.id}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ClusterCard;
