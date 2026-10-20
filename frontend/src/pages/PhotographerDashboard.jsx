import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Camera, Calendar, MapPin,
    ChevronRight, Search, LogOut,
    Layout, Image as ImageIcon, HardDrive,
    FolderOpen, AlertCircle, Home, Bell
} from 'lucide-react';
import '../landing.css';
import '../styles/dashboard-theme.css';
import AILoader from '../components/ui/AILoader';
import { clearStoredAuth, photographerAPI } from '../services/api';

// --- Shared Design System Components ---

const StatCard = ({ label, value, icon: Icon, color = 'blue' }) => {
    const colorMap = {
        blue: { bg: '#FFF5EB', text: '#d86d13', border: '#FDDCB5' },
        indigo: { bg: '#FFF5EB', text: '#d86d13', border: '#FDDCB5' },
        emerald: { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' },
        amber: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    };
    const theme = colorMap[color] || colorMap.blue;

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.88)',
            border: '1px solid rgba(37, 30, 24, 0.08)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: theme.bg, color: theme.text }}>
                    <Icon size={16} />
                </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1f1f1f', letterSpacing: '-0.02em', fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
                {value}
            </div>
        </div>
    );
};

const AssignmentItem = ({ event, onSelect }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1, backgroundColor: '#FFF8F2' }}
        onClick={() => onSelect(event)}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(37, 30, 24, 0.06)',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            background: 'white'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                width: '40px', height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(180deg, rgba(245,130,31,0.16), rgba(245,130,31,0.06))',
                color: '#f5821f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.9rem'
            }}>
                {event.name.charAt(0)}
            </div>
            <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1f1f1f', margin: 0 }}>
                    {event.name}
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#666666' }}>
                    {event.event_id}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#666666', marginTop: '0.1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {event.location || 'Remote'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {event.date || 'Scheduled'}</span>
                </div>
            </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#999999', fontWeight: '500' }}>Count</div>
                <div style={{ fontSize: '0.9rem', color: '#1f1f1f', fontWeight: '600' }}>{event.photo_count || 0}</div>
            </div>
            <div style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: '1px solid #D1FAE5'
            }}>
                {(event.status || 'Active').toUpperCase()}
            </div>
            <ChevronRight size={16} color="#999999" />
        </div>
    </motion.div>
);

// --- Main Dashboard Component ---

const PhotographerDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ assignments: 0, uploads: 0, storage: '0 GB' });

    useEffect(() => {
        const storedUser = localStorage.getItem('photographer_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate('/photographer/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (user?.id) loadEvents();
    }, [user]);

    const loadEvents = async () => {
        if (!user?.id) return;
        try {
            const result = await photographerAPI.getAssignedEvents(user.id);
            if (result.status === 'success' || result.events) {
                const loadedEvents = result.events || [];
                setEvents(loadedEvents);
                const totalPhotos = loadedEvents.reduce((acc, e) => acc + (e.photo_count || 0), 0);
                const storageEst = (totalPhotos * 3.5 / 1024).toFixed(2);
                setStats({ assignments: loadedEvents.length, uploads: totalPhotos, storage: `${storageEst} GB` });
            }
        } catch (error) {
            console.error("Failed to load events", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearStoredAuth();
        navigate('/photographer/login');
    };

    const filteredEvents = events.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}><AILoader active={true} text="LOADING" /></div>;

    return (
        <div className="dashboard-themed" style={{ position: 'fixed', inset: 0, zIndex: 40, paddingTop: '76px', boxSizing: 'border-box', overflowY: 'auto' }}>

            {/* Top Navigation Header */}
            <header style={{
                background: 'rgba(255, 255, 255, 0.88)',
                borderBottom: '1px solid rgba(37, 30, 24, 0.08)',
                padding: '0.75rem 2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 50,
                backdropFilter: 'blur(12px)'
            }}>
                {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Camera size={18} />
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f1f1f' }}>EventLens</span>
                </div> */}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.5rem 0.4rem 0.4rem', borderRadius: '24px', background: '#FFF8F2', border: '1px solid rgba(37,30,24,0.06)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FDDCB5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d86d13', fontSize: '0.75rem', fontWeight: '600' }}>
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1f1f1f', paddingRight: '0.5rem' }}>
                            {user?.full_name?.split(' ')[0] || 'User'}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'white', border: '1px solid #E2E8F0',
                            padding: '0.5rem', borderRadius: '8px',
                            color: '#f80f06ff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#1E293B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                {/* Breadcrumbs & Title */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                        <Home size={14} /> <span>/</span> <span>Photographer Portal</span>
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1f1f1f', margin: 0, letterSpacing: '-0.025em', fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
                        Assignments Dashboard
                    </h1>
                    <p style={{ color: '#666666', marginTop: '0.5rem' }}>Manage your event photography tasks and uploads.</p>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <StatCard label="Active Assignments" value={stats.assignments} icon={Layout} color="indigo" />
                    <StatCard label="Total Uploads" value={stats.uploads} icon={ImageIcon} color="blue" />
                    <StatCard label="Cloud Usage" value={stats.storage} icon={HardDrive} color="emerald" />
                </div>

                {/* Assignments List Section */}
                <div style={{ background: 'rgba(255, 255, 255, 0.88)', borderRadius: '1.25rem', border: '1px solid rgba(37, 30, 24, 0.08)', boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(37, 30, 24, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f1f1f', margin: 0, fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>Current Assignments</h3>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input
                                type="text"
                                placeholder="Search events..."
                                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid rgba(245,130,31,0.18)', fontSize: '0.9rem', outline: 'none', background: '#fffdf9' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ minHeight: '300px' }}>
                        {filteredEvents.length > 0 ? (
                            <div>
                                {filteredEvents.map(event => (
                                    <AssignmentItem
                                        key={event.id}
                                        event={event}
                                        onSelect={(e) => navigate(`/photographer/event/${e.id}`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
                                <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>No assignments found matching your search.</p>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(37, 30, 24, 0.06)', background: '#FFF8F2', color: '#666666', fontSize: '0.8rem', textAlign: 'center' }}>
                        Showing {filteredEvents.length} of {events.length} assignments
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotographerDashboard;
