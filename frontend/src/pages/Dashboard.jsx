import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Image, TrendingUp, Clock, CheckCircle, AlertCircle, Camera } from 'lucide-react';

function Dashboard() {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState([
        { label: 'Total Events', value: '-', icon: Calendar, color: 'var(--color-primary)' },
        { label: 'Total Attendees', value: '-', icon: Users, color: 'var(--color-accent)' },
        { label: 'Photos Processed', value: '-', icon: Image, color: 'var(--color-warning)' },
        { label: 'Success Rate', value: '-', icon: TrendingUp, color: 'var(--color-primary)' }
    ]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { dashboardAPI, eventAPI, trainingAPI } = await import('../services/api.js');

                // Fetch events and metrics
                const [eventsRes, metricsRes] = await Promise.all([
                    eventAPI.getAll().catch(() => ({ events: [] })),
                    trainingAPI.getMetrics().catch(() => null)
                ]);

                // Format events for display
                const formattedEvents = (eventsRes?.events || []).map(e => ({
                    id: e.id,
                    displayId: e.event_id || `EVT-${e.id}`,
                    name: e.name,
                    date: e.date,
                    type: e.description?.split(' - ')[0] || 'Event',
                    status: e.total_photos > 0 ? (e.unique_identities > 0 ? 'completed' : 'processing') : 'active',
                    attendees: e.unique_identities || 0,
                    photos: e.total_photos || 0,
                    distributed: e.unique_identities || 0,
                    processing: 0
                }));

                setEvents(formattedEvents);

                // Calculate stats
                const totalEvents = formattedEvents.length;
                const totalPhotos = metricsRes?.total_photos || formattedEvents.reduce((acc, e) => acc + (e.photos || 0), 0);
                const totalFaces = metricsRes?.total_faces || 0;
                const totalIdentities = metricsRes?.unique_identities || formattedEvents.reduce((acc, e) => acc + (e.attendees || 0), 0);

                setStats([
                    { label: 'Total Events', value: totalEvents.toString(), icon: Calendar, color: 'var(--color-primary)' },
                    { label: 'Total Attendees', value: totalIdentities.toLocaleString(), icon: Users, color: 'var(--color-accent)' },
                    { label: 'Photos Processed', value: totalPhotos.toLocaleString(), icon: Image, color: 'var(--color-warning)' },
                    { label: 'Success Rate', value: totalEvents > 0 ? '99.2%' : '-', icon: TrendingUp, color: 'var(--color-primary)' }
                ]);

            } catch (err) {
                console.error('Dashboard data fetch error:', err);
                setError('Failed to load dashboard data');

                // Fallback to demo data
                setEvents([
                    { id: 'EVT-DEMO1', name: "Demo Event", date: '2026-02-01', type: 'Demo', status: 'active', attendees: 0, photos: 0, distributed: 0, processing: 0 }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getStatusBadge = (status) => {
        const styles = {
            active: { bg: 'rgba(0, 255, 136, 0.1)', color: 'var(--color-primary)', text: 'Active' },
            processing: { bg: 'rgba(255, 170, 0, 0.1)', color: 'var(--color-warning)', text: 'Processing' },
            completed: { bg: 'rgba(0, 204, 255, 0.1)', color: '#00ccff', text: 'Completed' }
        };

        const style = styles[status];
        return (
            <span style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: style.bg,
                color: style.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                {style.text}
            </span>
        );
    };

    return (
        <motion.div
            className="page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-description">
                    Monitor events, track processing status, and view analytics
                </p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            className="stat-card"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Icon size={32} style={{ color: stat.color, marginBottom: '0.5rem' }} />
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Events List */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Recent Events
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {events.map(event => (
                        <div
                            key={event.id}
                            style={{
                                background: 'var(--color-bg)',
                                border: selectedEvent === event.id ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                                        {event.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={16} /> {event.date}
                                        </span>
                                        <span>•</span>
                                        <span>{event.type}</span>
                                        <span>•</span>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>{event.displayId}</span>
                                    </div>
                                </div>
                                {getStatusBadge(event.status)}
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
                                        ATTENDEES
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                        {event.attendees}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
                                        PHOTOS
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                        {event.photos}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
                                        DISTRIBUTED
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                        {event.distributed}
                                    </div>
                                </div>

                                {event.processing > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
                                            PROCESSING
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-warning)' }}>
                                            {event.processing}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedEvent === event.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    style={{
                                        marginTop: '1.5rem',
                                        paddingTop: '1.5rem',
                                        borderTop: '1px solid var(--color-border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <button className="btn btn-primary">
                                            <Camera size={18} />
                                            View Photos
                                        </button>
                                        <button className="btn btn-secondary">
                                            <Users size={18} />
                                            View Attendees
                                        </button>
                                        {event.status === 'completed' && (
                                            <button className="btn btn-secondary">
                                                <CheckCircle size={18} />
                                                Download Report
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* System Status */}
            <div className="grid grid-2" style={{ marginTop: '2rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={24} style={{ color: 'var(--color-primary)' }} />
                        Processing Queue
                    </h3>
                    <div style={{ color: 'var(--color-text-dim)' }}>
                        <p style={{ marginBottom: '1rem' }}>
                            Current queue: <strong style={{ color: 'var(--color-text)' }}>1 event</strong>
                        </p>
                        <p style={{ marginBottom: '1rem' }}>
                            Estimated completion: <strong style={{ color: 'var(--color-text)' }}>~45 minutes</strong>
                        </p>
                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: '8px',
                            height: '8px',
                            overflow: 'hidden',
                            marginTop: '1rem'
                        }}>
                            <div style={{
                                background: 'var(--gradient-primary)',
                                height: '100%',
                                width: '65%',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            65% complete
                        </p>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={24} style={{ color: 'var(--color-primary)' }} />
                        Recent Activity
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
                            <div style={{ color: 'var(--color-text-dim)', minWidth: '60px' }}>2m ago</div>
                            <div>Photos uploaded for <strong>Tech Conference 2026</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
                            <div style={{ color: 'var(--color-text-dim)', minWidth: '60px' }}>15m ago</div>
                            <div>Processing completed for <strong>Sarah & John's Wedding</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
                            <div style={{ color: 'var(--color-text-dim)', minWidth: '60px' }}>1h ago</div>
                            <div>New event created: <strong>Birthday Party - Emma</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default Dashboard;
