import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Plus, ChevronRight,
    Image as ImageIcon, Users, Clock, Settings,
    Search, Filter, UserPlus, MoreHorizontal, LayoutGrid, List, Trash2
} from 'lucide-react';
import '../landing.css';
import '../styles/dashboard-theme.css';
import { organizerAPI, eventAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { getEventCover } from '../utils/eventConstants';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const OrganizerEventsPage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [hoverFilter, setHoverFilter] = useState(null);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                // Get user from localStorage
                const userStr = localStorage.getItem('organizer_user');
                if (!userStr) {
                    // User not logged in, redirect to login
                    addToast('Please log in to view your events', 'error');
                    navigate('/organizer/login');
                    return;
                }

                const user = JSON.parse(userStr);
                if (!user.id) {
                    addToast('Invalid session. Please log in again.', 'error');
                    navigate('/organizer/login');
                    return;
                }

                // Fetch real events from API
                const result = await organizerAPI.getEvents(user.id);

                if (result && result.status === 'success' && result.events) {
                    // Map backend fields to frontend expected format
                    const mappedEvents = result.events.map((event, idx) => ({
                        id: event.id,
                        event_id: event.event_id,
                        name: event.name,
                        date: event.date,
                        location: event.location,
                        status: event.status || 'active',
                        total_photos: event.photo_count || 0,
                        processed_photos: event.face_count || 0, // faces detected = processed
                        attendees: event.attendee_count || 0,
                        cover_image: event.cover_image || getEventCover(event.id)
                    }));
                    setEvents(mappedEvents);
                } else {
                    setEvents([]);
                }
                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        };

        loadEvents();
    }, []);

    const initiateDeleteEvent = (e, event) => {
        e.stopPropagation();
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteEvent = async () => {
        if (!eventToDelete) return;

        setIsDeleting(true);
        try {
            await eventAPI.delete(eventToDelete.id);
            setEvents(events.filter(event => event.id !== eventToDelete.id));
            addToast('Event deleted successfully', 'success');
            setIsDeleteModalOpen(false);
            setEventToDelete(null);
        } catch (err) {
            console.error("Failed to delete event:", err);
            addToast('Failed to delete event', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDeleteEvent = () => {
        setIsDeleteModalOpen(false);
        setEventToDelete(null);
    };

    const filteredEvents = events;

    return (
        <div className="dashboard-themed" style={{
            height: '100vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Ambient Orange Glow (Top Left) */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '-5%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(245, 130, 31, 0.10) 0%, transparent 70%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Dot-pattern overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: 'linear-gradient(rgba(245,130,31,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,130,31,0.06) 1px, transparent 1px)',
                backgroundSize: '34px 34px',
                opacity: 0.35,
                maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.8), transparent 80%)'
            }} />
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '90px 2rem 2rem', // Added top padding for fixed navbar
                overflowY: 'auto', /* Scroll internally */
                maxWidth: '100%',
                position: 'relative',
                zIndex: 1
            }}>

                {/* 1. Sticky Header Bar */}
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(12px)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(37,30,24,0.08)',
                    boxShadow: '0 4px 12px -6px rgba(66,35,5,0.18)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div>
                            <h1 style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#d86d13',
                                lineHeight: 1.2,
                                margin: 0,
                                fontFamily: "'Sora', 'Segoe UI', sans-serif"
                            }}>
                                My Events
                            </h1>
                            <p style={{ color: '#666666', fontSize: '0.8rem', margin: 0 }}>
                                {events.length} total • {events.filter(e => e.status === 'active').length} active
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/organizer/add-photographer')}
                            className="header-action-btn"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                color: '#475569',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                            title="Add Photographer"
                        >
                            <UserPlus size={16} />
                            <span>Add Photographer</span>
                        </button>
                        <button
                            onClick={() => navigate('/event-registration')}
                            className="header-action-btn"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px -4px rgba(217,109,19,0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(217,109,19,0.5)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(217,109,19,0.4)'; }}
                            title="New Event"
                        >
                            <Plus size={16} />
                            <span>New Event</span>
                        </button>
                    </div>
                </header>

                {/* 2. Responsive Grid */}
                <div style={{
                    display: 'grid',
                    /* Auto-fit with a slightly adjusted min-width for perfect filling */
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1.25rem',
                    paddingBottom: '2rem'
                }}>
                    {/* Create New Card */}
                    <div
                        onClick={() => navigate('/event-registration')}
                        style={{
                            border: '1px dashed rgba(245,130,31,0.4)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            minHeight: '260px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,248,242,0.95) 100%)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.borderColor = '#f5821f';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(245,130,31,0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(245,130,31,0.4)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            width: '40px', height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            border: '1px solid rgba(245,130,31,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1rem',
                            color: '#f5821f',
                            boxShadow: '0 4px 6px -1px rgba(245,130,31,0.15)'
                        }}>
                            <Plus size={24} strokeWidth={2} />
                        </div>
                        <span style={{ fontWeight: '700', color: '#d86d13', fontSize: '1rem', letterSpacing: '-0.01em', fontFamily: "'Sora', sans-serif" }}>Create Event</span>
                        <span style={{ fontSize: '0.85rem', color: '#666666', opacity: 0.8, marginTop: '0.25rem' }}>Start a new collection</span>
                    </div>

                    <AnimatePresence>
                        {filteredEvents.map((event) => (
                            <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -2, boxShadow: '0 8px 24px -6px rgba(66,35,5,0.22)' }}
                                onClick={() => navigate(`/organizer/event/${event.id}/dashboard`)}
                                style={{
                                    background: 'rgba(255,255,255,0.88)',
                                    borderRadius: '1.25rem',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 4px 12px -6px rgba(66,35,5,0.18)',
                                    border: '1px solid rgba(37,30,24,0.08)',
                                    transition: 'all 0.2s ease',
                                    height: '100%'
                                }}
                            >
                                <div style={{ height: '130px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                                    <img
                                        src={event?.cover_image || getEventCover(event?.id)}
                                        onError={(e) => {
                                            e.target.onerror = null; // Prevent infinite loops
                                            e.target.src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80';
                                        }}
                                        alt={event?.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(4px)',
                                        padding: '2px 8px', borderRadius: '4px',
                                        fontSize: '0.65rem', fontWeight: '700', color: 'white',
                                        textTransform: 'uppercase'
                                    }}>
                                        {event.status}
                                    </div>
                                    <button
                                        onClick={(e) => initiateDeleteEvent(e, event)}
                                        style={{
                                            position: 'absolute', top: '0.5rem', left: '0.5rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(4px)',
                                            padding: '6px', borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            color: '#EF4444',
                                            zIndex: 10
                                        }}
                                        title="Delete Event"
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        <Trash2 size={14} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ marginBottom: 'auto' }}>
                                        <h3 style={{
                                            margin: '0 0 0.25rem 0',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            color: '#1f1f1f',
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            fontFamily: "'Sora', 'Segoe UI', sans-serif"
                                        }}>
                                            {event.name}
                                        </h3>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#999999', marginBottom: '0.25rem' }}>
                                            {event.event_id}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#666666', fontSize: '0.8rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={12} />
                                                <span>{event.date}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <MapPin size={12} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        marginTop: '0.75rem',
                                        paddingTop: '0.75rem',
                                        borderTop: '1px solid rgba(37,30,24,0.06)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <ImageIcon size={14} color="#999999" />
                                                <span style={{ fontWeight: '700', color: '#1f1f1f' }}>{event.total_photos}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Users size={14} color="#999999" />
                                                <span style={{ fontWeight: '700', color: '#1f1f1f' }}>{event.attendees}</span>
                                            </div>
                                        </div>
                                        <div style={{ color: '#d86d13', fontWeight: '700', fontSize: '0.7rem' }}>
                                            View →
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={cancelDeleteEvent}
                    onConfirm={confirmDeleteEvent}
                    title="Delete Event"
                    message={`Are you sure you want to delete "${eventToDelete?.name}"? This action cannot be undone and will delete all photos and data associated with this event.`}
                    type="danger"
                    confirmText="Delete Event"
                    isLoading={isDeleting}
                />
            </div>
        </div>
    );
};

export default OrganizerEventsPage;
