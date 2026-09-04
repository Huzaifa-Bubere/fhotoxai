import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ChevronDown, AlertCircle, Loader2, Users, ArrowLeft } from 'lucide-react';

import { getClusterList, getTrainingMetrics } from '../../../utils/photoClusteringApi';
import ClusterCard from './ClusterCard';
import './ClusterGrid.css';

/**
 * ClusterGrid renders the clustered people (albums) for an event.
 */
const ClusterGrid = ({ eventId: eventIdProp }) => {
  const { eventId: eventIdParam } = useParams();
  const eventId = eventIdProp || eventIdParam || 1;

  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('count');
  const [filterText, setFilterText] = useState('');
  const [trainingState, setTrainingState] = useState({
    inProgress: false,
    progress: 0,
    status: ''
  });

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    async function initializeGrid() {
      setLoading(true);
      setError(null);

      try {
        const metrics = await getTrainingMetrics(eventId);

        if (metrics.trainingInProgress) {
          setTrainingState({
            inProgress: true,
            progress: parseInt(metrics.completionStatus, 10) || 0,
            status: 'AI Model Training in Progress...'
          });
          setLoading(false);
          startPolling();
          return;
        }

        await fetchClusters();
      } catch (err) {
        console.error('ClusterGrid initialization failed:', err);
        setError('Failed to load clusters. Please try again later.');
        setLoading(false);
      }
    }

    initializeGrid();

    return () => stopPolling();
  }, [eventId]);

  const fetchClusters = async () => {
    try {
      const data = await getClusterList(eventId);
      setClusters(data.clusters || []);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
      setError('Failed to load clusters.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const metrics = await getTrainingMetrics(eventId);

        if (!metrics.trainingInProgress) {
          stopPolling();
          setTrainingState(prev => ({ ...prev, inProgress: false, progress: 100 }));
          setLoading(true);
          await fetchClusters();
        } else {
          setTrainingState({
            inProgress: true,
            progress: parseInt(metrics.completionStatus, 10) || 0,
            status: 'Processing detected faces...'
          });
        }
      } catch (err) {
        console.error('ClusterGrid polling error:', err);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const filteredClusters = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) {
      return clusters;
    }

    return clusters.filter(cluster =>
      (cluster.name || '').toLowerCase().includes(term) ||
      String(cluster.id).includes(term)
    );
  }, [clusters, filterText]);

  const sortedClusters = useMemo(() => {
    const ordered = [...filteredClusters];

    if (sortBy === 'name') {
      ordered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return ordered;
    }

    ordered.sort((a, b) => Number(b.total_faces || 0) - Number(a.total_faces || 0));
    return ordered;
  }, [filteredClusters, sortBy]);

  const handleClusterUpdated = (updatedCluster) => {
    setClusters(prev => prev.map(c => c.id === updatedCluster.id ? updatedCluster : c));
  };

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
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        height: '600px',
        background: 'radial-gradient(50% 50% at 50% 0%, rgba(244, 63, 94, 0.08) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/photo-clustering" style={{ padding: '0.5rem', borderRadius: '8px', color: '#64748B', display: 'flex' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>Face Albums</h1>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Event ID: {eventId}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} />
            <span>{clusters.length} Albums</span>
          </div>
        </header>

        <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div style={{
              padding: '1.5rem',
              border: '1px solid #FECACA',
              background: '#FEF2F2',
              borderRadius: '12px',
              color: '#B91C1C',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <AlertCircle size={24} />
              <div>
                <div style={{ fontWeight: '600' }}>Error Loading Albums</div>
                <div style={{ fontSize: '0.9rem' }}>{error}</div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
              <div className="loading-spinner" style={{ borderTopColor: '#F43F5E', borderLeftColor: '#FEE2E2' }}></div>
            </div>
          ) : trainingState.inProgress ? (
            <div style={{
              padding: '4rem',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              maxWidth: '600px',
              margin: '3rem auto'
            }}>
              <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #FEE2E2' }}></div>
                <Loader2 className="animate-spin" size={64} color="#F43F5E" style={{ position: 'relative' }} />
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1E293B' }}>
                AI Model Training in Progress
              </h3>
              <p style={{ color: '#64748B', marginBottom: '2rem', maxWidth: '400px' }}>
                The neural network is currently analyzing photos and extracting every detectable face.
              </p>

              <div style={{ width: '100%', maxWidth: '350px', height: '8px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{
                  width: `${trainingState.progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #F43F5E, #E11D48)',
                  transition: 'width 0.5s ease-out',
                  borderRadius: '10px'
                }} />
              </div>
              <div style={{ fontWeight: '700', color: '#F43F5E', fontSize: '0.9rem' }}>
                {trainingState.progress}% Complete
              </div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                marginBottom: '2rem',
                background: 'white',
                border: '1px solid #E2E8F0',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search by person name or face ID..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem 0.65rem 2.75rem',
                      border: '1px solid #E2E8F0',
                      fontFamily: 'inherit',
                      background: '#F8FAFC',
                      color: '#1E293B',
                      borderRadius: '8px',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>Sort by:</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        appearance: 'none',
                        padding: '0.65rem 2.5rem 0.65rem 1rem',
                        border: '1px solid #E2E8F0',
                        background: 'white',
                        color: '#1E293B',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        minWidth: '180px',
                        outline: 'none'
                      }}
                    >
                      <option value="count">Most Photos</option>
                      <option value="name">Name (A-Z)</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
                  </div>
                </div>
              </div>

              {clusters.length === 0 ? (
                <div style={{
                  padding: '5rem',
                  textAlign: 'center',
                  border: '1px dashed #E2E8F0',
                  borderRadius: '16px',
                  background: 'white'
                }}>
                  <div style={{ width: '64px', height: '64px', background: '#F1F5F9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Users size={32} color="#94A3B8" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1E293B' }}>No Albums Found</h3>
                  <p style={{ color: '#64748B', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                    No albums have been generated for this event yet.
                  </p>
                  <Link to="/photo-clustering" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: '600',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)'
                  }}>
                    Start Processing
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>
                        Displaying {sortedClusters.length} albums
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        Each card represents a unique person.
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1rem',
                    width: '100%'
                  }}>
                    {sortedClusters.map(cluster => (
                      <div key={cluster.id} style={{ minWidth: 0 }}>
                        <ClusterCard cluster={cluster} onClusterUpdated={handleClusterUpdated} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClusterGrid;
