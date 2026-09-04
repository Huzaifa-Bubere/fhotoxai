import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClusterFaces, updateClusterName, getPhotoUrl } from '../../../utils/photoClusteringApi';
import CinematicManager from './cinematic/CinematicManager';
import CollageManager from './collage/CollageManager';
import FlipbookManager from './flipbook/FlipbookManager';
import { useToast } from '../../../context/ToastContext';
import { Layout, BookOpen } from 'lucide-react';
import Footer from '../../layout/Footer';
import { ChevronLeft, Edit2, Check, X, Sparkles, Image as ImageIcon, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ClusterViewer Component
 * 
 * Displays all photos containing a specific person (cluster) with pagination
 * and name editing functionality. Shows full photos where the person appears.
 */
const ClusterViewer = () => {
  const { clusterId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [faces, setFaces] = useState([]);
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalFaces, setTotalFaces] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFace, setSelectedFace] = useState(null);
  const [showMemories, setShowMemories] = useState(false);
  const [showCollage, setShowCollage] = useState(false);
  const [showFlipbook, setShowFlipbook] = useState(false);
  const [allPhotos, setAllPhotos] = useState(null);
  const [isOpeningPremiumView, setIsOpeningPremiumView] = useState(false);

  const facesPerPage = 20;

  // Load cluster faces
  useEffect(() => {
    async function fetchClusterFaces() {
      if (!clusterId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getClusterFaces(clusterId, facesPerPage, page * facesPerPage);
        setFaces(data.faces || []);
        setCluster(data.cluster || {});
        setTotalFaces(data.total || 0);

        if (data.cluster && data.cluster.cluster_name) {
          setNewName(data.cluster.cluster_name);
        }
      } catch (err) {
        console.error('Failed to load cluster faces:', err);
        setError('Failed to load identity matrix. Please retry.');
      } finally {
        setLoading(false);
      }
    }
    fetchClusterFaces();
  }, [clusterId, page]);

  const totalPages = Math.ceil(totalFaces / facesPerPage);

  const saveClusterName = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === cluster.cluster_name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateClusterName(clusterId, newName.trim());
      if (result.success) {
        setCluster({ ...cluster, cluster_name: newName.trim() });
      }
    } catch (error) {
      console.error('Failed to update name:', error);
      setNewName(cluster.cluster_name);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleNextPhoto = (e) => {
    if (e) e.stopPropagation();
    if (!selectedFace || !faces.length) return;
    const currentIndex = faces.findIndex(f => f.id === selectedFace.id);
    const nextIndex = (currentIndex + 1) % faces.length;
    setSelectedFace(faces[nextIndex]);
  };

  const handlePrevPhoto = (e) => {
    if (e) e.stopPropagation();
    if (!selectedFace || !faces.length) return;
    const currentIndex = faces.findIndex(f => f.id === selectedFace.id);
    const prevIndex = (currentIndex - 1 + faces.length) % faces.length;
    setSelectedFace(faces[prevIndex]);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedFace) return;
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'Escape') setSelectedFace(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFace, faces]);

  const openPremiumView = async (type) => {
    // If we already loaded them, just open
    if (allPhotos && allPhotos.length > 0) {
      if (type === 'collage') setShowCollage(true);
      if (type === 'flipbook') setShowFlipbook(true);
      return;
    }

    setIsOpeningPremiumView(true);
    try {
      // Fetch up to 1000 photos for the full preview explicitly
      const data = await getClusterFaces(clusterId, 1000, 0);
      
      if (!data.faces || data.faces.length === 0) {
         throw new Error("No photos found in this cluster to view.");
      }
      
      const fullFaceList = data.faces;
      const urls = fullFaceList.map(f => f.photo_url.startsWith('http') ? f.photo_url : getPhotoUrl(f.photo_url));
      
      setAllPhotos(urls);
      
      if (type === 'collage') setShowCollage(true);
      if (type === 'flipbook') setShowFlipbook(true);
    } catch (err) {
      console.error('Failed to load all photos for view:', err);
      addToast("Failed to load all photos. Please try again.", "error");
    } finally {
      setIsOpeningPremiumView(false);
    }
  };

  // Render loading state
  if (loading && !faces.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', background: '#F8FAFC' }}>
        <Loader2 className="animate-spin" size={32} color="#6366F1" style={{ marginBottom: '1rem' }} />
        <div style={{ fontFamily: 'Inter, sans-serif', color: '#64748B', fontSize: '0.9rem', fontWeight: '500' }}>Loading Identity Matrix...</div>
      </div>
    );
  }

  // Render error
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Error Loading Identity</h2>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.5rem 1rem', background: '#1E293B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            Retry
          </button>
          <Link to="/photo-clustering" style={{ display: 'block', marginTop: '1rem', color: '#64748B', fontSize: '0.9rem', textDecoration: 'none' }}>
            Back to Clusters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      backgroundColor: '#F8FAFC',
      backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
      color: '#1E293B',
      fontFamily: '"Inter", -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <header style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <Link to={cluster?.event_id ? `/clusters/${cluster.event_id}` : "/photo-clustering"} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s', hover: { color: '#1E293B' } }}>
              <ArrowLeft size={16} /> Back to Visualization
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isEditing ? (
                  <form onSubmit={saveClusterName} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                      style={{
                        background: 'white',
                        border: '1px solid #6366F1',
                        color: '#1E293B',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '8px',
                        outline: 'none',
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                        minWidth: '300px'
                      }}
                    />
                    <button type="submit" style={{ background: '#10B981', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}><Check size={20} /></button>
                    <button type="button" onClick={() => setIsEditing(false)} style={{ background: '#EF4444', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}><X size={20} /></button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#1E293B', letterSpacing: '-0.02em' }}>
                      {cluster?.cluster_name || "Unknown Identity"}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6366F1'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: '600', color: '#1E293B' }}>{totalFaces} Photos Found</span>
                  <span style={{ fontSize: '0.8rem' }}>ID: {clusterId.substring(0, 8)}...</span>
                </div>

                <button
                  onClick={() => openPremiumView('collage')}
                  disabled={isOpeningPremiumView}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    color: '#1E293B',
                    fontWeight: '600',
                    cursor: isOpeningPremiumView ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    opacity: isOpeningPremiumView ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                >
                  <Layout size={16} color="#6366F1" /> Collage
                </button>
                <button
                  onClick={() => openPremiumView('flipbook')}
                  disabled={isOpeningPremiumView}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    color: '#1E293B',
                    fontWeight: '600',
                    cursor: isOpeningPremiumView ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    opacity: isOpeningPremiumView ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                >
                  {isOpeningPremiumView ? <Loader2 size={16} className="animate-spin" color="#6366F1" /> : <BookOpen size={16} color="#10B981" />} Flipbook
                </button>
                <button
                  onClick={() => setShowMemories(true)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    color: '#1E293B',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                >
                  <Sparkles size={16} color="#F59E0B" /> Cinematic Memory
                </button>
              </div>
            </div>
          </div>
        </header>

        <div style={{ padding: '2rem', paddingBottom: '400px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Photos Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            width: '100%'
          }}>
            {faces.map(face => {
              const hasBbox = face.bbox && face.bbox.length === 4 && face.photo_width && face.photo_height;
              return (
                <motion.div
                  key={face.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => setSelectedFace(face)}
                  whileHover={{ scale: 1.02, zIndex: 5 }}
                >
                  <img
                    src={face.photo_url.startsWith('http') ? face.photo_url : getPhotoUrl(face.photo_url)}
                    alt="Face"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  {hasBbox && (
                    <div style={{
                      position: 'absolute',
                      left: `${(face.bbox[0] / face.photo_width) * 100}%`,
                      top: `${(face.bbox[1] / face.photo_height) * 100}%`,
                      width: `${(face.bbox[2] / face.photo_width) * 100}%`,
                      height: `${(face.bbox[3] / face.photo_height) * 100}%`,
                      border: '2px solid rgba(99, 102, 241, 0.8)',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.2)'
                    }} />
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.4rem 0.6rem',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    color: 'white', fontSize: '0.75rem', fontWeight: '500',
                    display: 'flex', justifyContent: 'flex-end'
                  }}>
                    {Math.round(face.confidence * 100)}%
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination - Clean Style */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', gap: '1rem', alignItems: 'center' }}>
              <button
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  color: page === 0 ? '#CBD5E1' : '#1E293B',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  color: page >= totalPages - 1 ? '#CBD5E1' : '#1E293B',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }} />

      </div>

      {/* Face Detail Modal */}
      {selectedFace && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }} onClick={() => setSelectedFace(null)}>
          <div style={{ position: 'relative', maxHeight: '90vh', maxWidth: '90vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedFace(null)}
              style={{ position: 'absolute', top: '-3rem', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', zIndex: 110 }}
            >
              <X size={32} />
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={handlePrevPhoto}
              style={{
                position: 'fixed', left: '2rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                padding: '1rem', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)',
                transition: 'all 0.2s', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <ChevronLeft size={36} />
            </button>

            <button
              onClick={handleNextPhoto}
              style={{
                position: 'fixed', right: '2rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                padding: '1rem', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)',
                transition: 'all 0.2s', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <ChevronRight size={36} />
            </button>

            <img
              src={selectedFace.photo_url.startsWith('http') ? selectedFace.photo_url : getPhotoUrl(selectedFace.photo_url)}
              style={{ maxHeight: '85vh', maxWidth: '85vw', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', objectFit: 'contain' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Cinematic Manager Modal */}
      {showMemories && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          padding: '2rem'
        }} onClick={() => setShowMemories(false)}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1000px',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <CinematicManager
              initialPhotos={faces.map(f => f.photo_url.startsWith('http') ? f.photo_url : getPhotoUrl(f.photo_url))}
              onClose={() => setShowMemories(false)}
              mode="modal"
              eventName={cluster?.event_name || cluster?.cluster_name || "Event Photos"}
            />
          </div>
        </div>
      )}

      {/* Collage Manager Modal */}
      {showCollage && (
        <CollageManager
          initialPhotos={allPhotos || faces.map(f => f.photo_url.startsWith('http') ? f.photo_url : getPhotoUrl(f.photo_url))}
          onClose={() => setShowCollage(false)}
          backLabel="Back to Clusters"
        />
      )}

      {/* Flipbook Manager Modal */}
      {showFlipbook && (
        <FlipbookManager
          initialPhotos={allPhotos || faces.map(f => f.photo_url.startsWith('http') ? f.photo_url : getPhotoUrl(f.photo_url))}
          onClose={() => setShowFlipbook(false)}
          backLabel="Back to Clusters"
          eventName={cluster?.event_name || cluster?.cluster_name || "Event Photos"}
        />
      )}
    </div>
  );
};

export default ClusterViewer;