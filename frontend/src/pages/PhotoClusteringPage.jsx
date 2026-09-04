import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Play, CheckCircle, Database, Server,
  RefreshCw, Camera, Users, Image as ImageIcon,
  ChevronRight, MapPin, Calendar, User, Zap, ArrowLeft, Loader2
} from 'lucide-react';
import '../landing.css';
import { trainingAPI, organizerAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { getEventCover } from '../utils/eventConstants';

// --- Reusable "Mature SaaS" Components ---

const SkeletonMetric = () => (
  <div style={{
    background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '1rem', alignItems: 'center'
  }}>
    <div className="animate-pulse" style={{ width: '36px', height: '36px', background: '#E2E8F0', borderRadius: '8px' }} />
    <div style={{ flex: 1 }}>
      <div className="animate-pulse" style={{ height: '20px', width: '60%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '0.25rem' }} />
      <div className="animate-pulse" style={{ height: '12px', width: '40%', background: '#E2E8F0', borderRadius: '4px' }} />
    </div>
  </div>
);

const AIProcessingVisualizer = () => (
  <div style={{
    width: '100%', height: '120px',
    background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0) 100%)',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', marginBottom: '2rem',
    borderRadius: '16px'
  }}>
    <div style={{ position: 'absolute', width: '100%', height: '1px', background: '#6366F1', top: '50%', boxShadow: '0 0 15px #6366F1' }}>
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        style={{ width: '20%', height: '100%', background: 'linear-gradient(90deg, transparent, #fff, transparent)', opacity: 0.5 }}
      />
    </div>
    <div style={{ display: 'flex', gap: '3rem', zIndex: 1 }}>
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
          style={{
            width: '12px', height: '12px',
            background: '#6366F1', borderRadius: '50%',
            boxShadow: '0 0 10px #6366F1'
          }}
        />
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: '10px', fontSize: '0.75rem', color: '#6366F1', letterSpacing: '0.1em', fontWeight: '600' }}>
      NEURAL ENGINE ACTIVE
    </div>
  </div>
);

const StandardCard = ({ children, className = "", style = {}, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`standard-card ${className}`}
    onClick={onClick}
    style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      ...style
    }}
  >
    {children}
  </motion.div>
);

const MetricItem = ({ icon: Icon, label, value, color = "#6366F1" }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '1rem',
    background: '#F8FAFC',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    transition: 'all 0.2s ease',
    cursor: 'default'
  }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'white'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
  >
    <div style={{
      width: '36px', height: '36px', borderRadius: '8px',
      background: 'white',
      border: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color
    }}>
      <Icon size={18} />
    </div>
    <div>
      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
    </div>
  </div>
);

const SuccessModal = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '500px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
          }}>
            <CheckCircle size={40} color="white" />
          </div>

          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: '#1E293B',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}>
            Processing Initiated
          </h3>

          <p style={{
            fontSize: '1rem',
            color: '#64748B',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            Photo clustering has been successfully initiated. <br></br>
            <br></br>
            The processing will continue in the background, you will receive an email notification once it's done. <br></br>
            <br></br>
            No further action is required at this time.
          </p>

          <button
            onClick={onClose}
            style={{
              padding: '0.8rem 3rem',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(79, 70, 229, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(79, 70, 229, 0.2)';
            }}
          >
            OK
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const PhotoClusteringPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepEventId = searchParams.get('eventId');
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isClustering, setIsClustering] = useState(false);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ percentage: '0%', processed: 0, total: 0 });
  const [showModal, setShowModal] = useState(false);

  const detectedFaces = Number(selectedEvent?.face_count || 0);
  const identityAlbums = Number(selectedEvent?.cluster_count || 0);

  useEffect(() => {
    const fetchEvents = async () => {
      const userStr = localStorage.getItem('organizer_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        try {
          const res = await organizerAPI.getEvents(user.id);
          if (res.status === 'success') {
            setEvents(res.events);
            if (res.events.length > 0) {
              const initialId = deepEventId || res.events[0].id;
              setSelectedEventId(initialId);
              const found = res.events.find(e => e.id.toString() === initialId.toString());
              if (found) setSelectedEvent(found);
            }
          }
        } catch (e) {
          addToast("Failed to fetch events", "error");
        }
      }
    };
    fetchEvents();
  }, [deepEventId]);

  useEffect(() => {
    if (selectedEventId) {
      const event = events.find(e => e.id.toString() === selectedEventId.toString());
      setSelectedEvent(event);
      checkEventStatus(selectedEventId);
    } else {
      setSelectedEvent(null);
    }
  }, [selectedEventId, events]);

  const checkEventStatus = async (eventId) => {
    if (!eventId || status === 'processing') return;
    try {
      const metrics = await trainingAPI.getMetrics(eventId);
      const inProgress = metrics.training_in_progress || metrics.trainingInProgress;
      const uniqueIds = metrics.unique_identities || metrics.uniqueIdentities || 0;
      const percentage = metrics.completion_status || '0%';
      setProgress(prev => ({
        ...prev,
        total: metrics.total_photos || metrics.totalPhotos || 0,
        processed: metrics.photos_processed || metrics.photosProcessed || 0,
        percentage: percentage
      }));

      setSelectedEvent(prev => prev ? ({
        ...prev,
        photo_count: metrics.total_photos || metrics.totalPhotos || prev.photo_count,
        face_count: metrics.total_faces || metrics.totalFaces || prev.face_count,
        cluster_count: metrics.unique_identities || metrics.uniqueIdentities || prev.cluster_count
      }) : null);

      if (inProgress) {
        setStatus('processing');
        setIsClustering(true);
      } else if (uniqueIds > 0) {
        setStatus('complete');
      } else {
        setStatus('idle');
      }
    } catch (e) {
      console.error("Failed to check status", e);
    }
  };

  const startClusteringProtocol = async () => {
    if (!selectedEventId) {
      addToast("Please select an event.", "error");
      return;
    }

    setIsClustering(true);
    setStatus('processing');

    try {
      const result = await trainingAPI.startTraining(selectedEventId);
      if (result.status === 'success' || result.success === true) {
        setShowModal(true);
        addToast("Processing started...", "success");
        const pollInterval = setInterval(async () => {
          try {
            const metrics = await trainingAPI.getMetrics(selectedEventId);
            const inProgress = metrics.training_in_progress || metrics.trainingInProgress;
            const percentage = metrics.completion_status || '0%';

            setProgress({
              percentage,
              processed: metrics.photos_processed || 0,
              total: metrics.total_photos || 0
            });

            setSelectedEvent(prev => prev ? ({
              ...prev,
              photo_count: metrics.total_photos || metrics.totalPhotos || prev.photo_count,
              face_count: metrics.total_faces || metrics.totalFaces || prev.face_count,
              cluster_count: metrics.unique_identities || metrics.uniqueIdentities || prev.cluster_count
            }) : null);

            if (!inProgress) {
              clearInterval(pollInterval);
              setIsClustering(false);
              setStatus('complete');
              addToast("Processing complete.", "success");
            }
          } catch (err) {
            console.error("Polling error", err);
          }
        }, 1000);
      } else {
        throw new Error(result.message || "Unknown error");
      }
    } catch (error) {
      setIsClustering(false);
      setStatus('idle');
      addToast("Failed: " + error.message, "error");
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      color: '#1E293B',
      fontFamily: '"Inter", -apple-system, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>

      {/* Ambient Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '600px', background: 'radial-gradient(50% 50% at 50% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/organizer/dashboard" style={{ padding: '0.5rem', borderRadius: '8px', color: '#64748B', display: 'flex' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>Processing & Clustering</h1>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
          AI Vision Engine v2.0
        </div>
      </header>

      {/* Content Container */}
      <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          {isClustering ? (
            <AIProcessingVisualizer />
          ) : (
            <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <Brain size={32} color="#6366F1" />
            </div>
          )}
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1E293B', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {isClustering ? ' processing biometric data...' : 'Identify & Group Guests'}
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#64748B', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            {isClustering ? ' The neural engine is currently analyzing facial features and generating clustering vectors.' : 'Run our advanced facial recognition model to automatically group detected faces into identity albums.'}
          </p>
        </div>

        <StandardCard>
          {/* Event Selector */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', color: '#475569', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Select Event to Process</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  paddingRight: '2.5rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  color: '#1E293B',
                  fontSize: '1rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              >
                <option value="">Choose an event...</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <ChevronRight size={20} color="#64748B" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Stats Grid with Skeleton State */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
            {selectedEvent ? (
              <>
                <MetricItem label="Total Photos" value={selectedEvent.photo_count || 0} icon={ImageIcon} color="#3B82F6" />
                <MetricItem label="Face Detections" value={detectedFaces} icon={Users} color="#8B5CF6" />
                <MetricItem label="Identity Albums" value={identityAlbums} icon={Database} color="#EC4899" />
                <MetricItem
                  label="Status"
                  value={status === 'complete' ? 'Ready' : status === 'processing' ? 'Running' : 'Idle'}
                  icon={status === 'complete' ? CheckCircle : Server}
                  color={status === 'complete' ? '#10B981' : '#64748B'}
                />
              </>
            ) : (
              <>
                <SkeletonMetric />
                <SkeletonMetric />
                <SkeletonMetric />
                <SkeletonMetric />
              </>
            )}
          </div>

          {selectedEvent && detectedFaces > 0 && (
            <div style={{
              marginBottom: '2rem',
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              <strong style={{ color: '#1E293B' }}>{detectedFaces}</strong> face detections were grouped into{' '}
              <strong style={{ color: '#1E293B' }}>{identityAlbums}</strong> identity albums.
              {' '}Each album represents one person and can contain multiple photos.
            </div>
          )}

          {/* Action Area */}
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '2rem', border: '1px dashed #E2E8F0', textAlign: 'center' }}>
            {isClustering ? (
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '500', color: '#475569' }}>
                  <span>Processing Biometrics...</span>
                  <span style={{ color: '#6366F1' }}>{progress.percentage}</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: progress.percentage }}
                    transition={{ duration: 0.5 }}
                    style={{ height: '100%', background: '#6366F1', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                  Analyzing ....
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={startClusteringProtocol}
                  disabled={!selectedEventId || status === 'complete'}
                  style={{
                    background: (!selectedEventId || status === 'complete') ? '#E2E8F0' : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    color: (!selectedEventId || status === 'complete') ? '#94A3B8' : 'white',
                    border: 'none',
                    padding: '1rem 2.5rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: (!selectedEventId || status === 'complete') ? 'not-allowed' : 'pointer',
                    boxShadow: (selectedEventId && status !== 'complete') ? '0 10px 15px -3px rgba(79, 70, 229, 0.3)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {status === 'complete' ? (
                    <> <CheckCircle size={20} /> Processing Complete </>
                  ) : (
                    <> <Play size={20} fill="currentColor" /> Start Processing Chain </>
                  )}
                </button>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Estimated time: ~2 mins depending on load.</p>
              </div>
            )}

            {status === 'complete' && !isClustering && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #E2E8F0' }}
              >
                <button
                  onClick={() => navigate(`/clusters/${selectedEventId}`)}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    border: 'none',
                    padding: '1.25rem 3rem',
                    borderRadius: '16px',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                    boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(79, 70, 229, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4)';
                  }}
                >
                  View Detected Faces <ChevronRight size={24} />
                </button>
              </motion.div>
            )}
          </div>
        </StandardCard>
      </div>

      <SuccessModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};
export default PhotoClusteringPage;
