import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Image as ImageIcon, Upload, PartyPopper, ArrowRight, Loader2, Shield, CalendarDays, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import { attendeeAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const AttendeeWelcome = () => {
    const { attendeeId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [eventStatus, setEventStatus] = useState('active');
    const [eventName, setEventName] = useState('Event');
    const [allEvents, setAllEvents] = useState([]);
    const [selectedAttendeeEvent, setSelectedAttendeeEvent] = useState(null);
    const [profileEmail, setProfileEmail] = useState('');
    const [profileName, setProfileName] = useState('');



    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            try {
                const [detailsResponse, eventsResponse] = await Promise.all([
                    attendeeAPI.getDetails(attendeeId),
                    attendeeAPI.getMyEvents().catch(() => null),
                ]);

                if (!isMounted) {
                    return;
                }

                if (detailsResponse?.status === 'success' && detailsResponse.attendee) {
                    setEventStatus(detailsResponse.attendee.event_status || 'active');
                    setEventName(detailsResponse.attendee.event_name || 'Event');
                }

                if (eventsResponse?.status === 'success') {
                    const myEvents = eventsResponse.registered_events || [];
                    const eventCatalog = eventsResponse.all_events || [];
                    setAllEvents(eventCatalog);
                    setProfileEmail(eventsResponse.user?.email || '');
                    setProfileName(eventsResponse.user?.full_name || '');

                    const preferredEvent = myEvents.find(
                        (event) => String(event.attendee_id) === String(attendeeId)
                    ) || myEvents[0] || null;

                    setSelectedAttendeeEvent(preferredEvent);
                    if (preferredEvent) {
                        setEventStatus(preferredEvent.event_status || 'active');
                        setEventName(preferredEvent.event_name || 'Event');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch attendee details:", err);
            }
        };

        if (attendeeId) {
            fetchDetails();

            // Poll for status updates every 5 seconds
            const pollInterval = setInterval(fetchDetails, 5000);
            return () => {
                isMounted = false;
                clearInterval(pollInterval);
            };
        }
    }, [attendeeId]);

    useEffect(() => {
        // Trigger confetti on mount
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const random = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        return () => clearInterval(interval);
    }, []);

    const handleGoToGallery = (eventOverride = null) => {
        const target = eventOverride || selectedAttendeeEvent;
        const targetAttendeeId = target?.attendee_id || attendeeId;
        const targetEventId = target?.event_id;
        const query = targetEventId ? `?eventId=${targetEventId}` : '';
        navigate(`/attendee/dashboard/attendee-${targetAttendeeId}${query}`);
    };

    const handleRegisterForEvent = (eventId) => {
        const params = new URLSearchParams();
        params.set('eventId', String(eventId));
        if (profileEmail) {
            params.set('email', profileEmail);
        }
        if (profileName) {
            params.set('name', profileName);
        }
        params.set('verified', 'true');
        navigate(`/attendee-registration?${params.toString()}`);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Generate preview URLs
        const newPreviewUrls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setSelectedFiles(prev => [...prev, ...files]);

        // Reset input so same files can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const clearSelection = () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        setSelectedFiles([]);
    };

    const handleConfirmUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        addToast(`Uploading ${selectedFiles.length} photos...`, 'info');

        try {
            const targetAttendeeId = selectedAttendeeEvent?.attendee_id || attendeeId;
            const targetEventId = selectedAttendeeEvent?.event_id || null;
            const result = await attendeeAPI.uploadPhotos(targetAttendeeId, targetEventId, selectedFiles, (percent) => {
                // Optional: Update progress logic
            });

            const uploadedCount = result?.uploaded ?? 0;
            const failedCount = result?.failed ?? 0;

            if (failedCount > 0) {
                addToast(`Uploaded ${uploadedCount} photo(s). ${failedCount} failed.`, 'info');
            } else {
                addToast(result.message || 'Photos uploaded successfully! You can upload more or go to your gallery.', 'success');
            }

            // Clear previews to reset the view
            clearSelection();

            // Stay on the same page (removed navigation)

        } catch (err) {
            console.error(err);
            addToast(err.message || 'Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previewUrls]);

    if (selectedFiles.length > 0) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Inter", sans-serif',
                position: 'relative',
                overflow: 'hidden',
                padding: '2rem'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{
                        width: '90%',
                        maxWidth: '600px',
                        background: 'white',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        padding: '1.5rem',
                        position: 'relative',
                        zIndex: 10,
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>
                            Review Upload ({selectedFiles.length})
                        </h2>
                        <button
                            onClick={clearSelection}
                            style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
                        >
                            Cancel
                        </button>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: '1rem',
                        overflowY: 'auto',
                        padding: '0.5rem',
                        margin: '0 -0.5rem 1.5rem',
                        minHeight: 0,
                        flex: '1 1 auto'
                    }}>
                        {previewUrls.map((url, idx) => (
                            <div key={idx} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                                <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}

                        <div
                            onClick={handleUploadClick}
                            style={{
                                aspectRatio: '1',
                                borderRadius: '12px',
                                border: '2px dashed #CBD5E1',
                                background: '#F8FAFC',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748B',
                                transition: 'border-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                        >
                            <Upload size={24} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                        <button
                            onClick={handleConfirmUpload}
                            disabled={isUploading}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                borderRadius: '12px',
                                background: isUploading ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                                color: 'white',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '1.05rem',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                boxShadow: isUploading ? 'none' : '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isUploading ? <Loader2 size={20} className="spin-slow" /> : <Upload size={20} />}
                            {isUploading ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </motion.div>
            </div>
        );
    }

    // Status-based content
    const getStatusContent = () => {
        // Default values
        let buttonText = "Go to My Gallery";
        let buttonDisabled = true; // Disabled by default, only enabled when completed
        let buttonIcon = <ImageIcon size={24} />;
        let message = "You're all set. Welcome to the event experience.";

        if (eventStatus === 'pre-event') {
            buttonText = "Event Hasn't Started Yet";
            buttonDisabled = true;
            message = `You have been successfully registered for ${eventName}. We look forward to see you there!`;
        } else if (eventStatus === 'active') {
            buttonText = "Gallery Not Ready";
            buttonDisabled = true;
            message = `You have been successfully registered for ${eventName}. We look forward to see you there!`;
        } else if (eventStatus === 'processing') {
            buttonText = "Gallery Processing";
            buttonDisabled = true;
            buttonIcon = <Loader2 size={24} className="spin-slow" />;
            message = "Our AI is currently working its magic. Your photos will be ready soon.";
        } else if (eventStatus === 'completed') {
            buttonText = "Go to My Gallery";
            buttonDisabled = false;
            message = "Your photos are ready! Dive in and relive the moments.";
        }

        return { buttonText, buttonDisabled, buttonIcon, message };
    };

    const { buttonText, buttonDisabled, buttonIcon, message } = getStatusContent();
    const isUploadDisabled = isUploading || eventStatus === 'processing' || eventStatus === 'completed';

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Inter", sans-serif',
            position: 'relative',
            overflow: 'hidden',
            padding: '2rem'
        }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div style={{
                    position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                    filter: 'blur(100px)', borderRadius: '50%'
                }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                    width: '100%',
                    maxWidth: '800px', // Wider to accommodate the list better
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div style={{
                    width: '80px', height: '80px',
                    background: '#EEF2FF',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: '#4F46E5'
                }}>
                    <PartyPopper size={40} />
                </div>

                <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>
                    Attendee Dashboard
                </h1>
                <p style={{ color: '#64748B', fontSize: '1.1rem', marginBottom: '3rem' }}>
                    Discover and join upcoming events, or view photos from events you're already registered for.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {allEvents.length === 0 ? (
                        <div style={{ padding: '2rem', color: '#64748B', background: '#F8FAFC', borderRadius: '12px' }}>
                            <Loader2 size={24} className="spin-slow" style={{ margin: '0 auto 1rem', display: 'block' }} />
                            Loading events or no events available...
                        </div>
                    ) : (
                        <div style={{ textAlign: 'left', display: 'grid', gap: '1rem' }}>
                            {allEvents.map((event) => {
                                const status = String(event.event_status || '').toLowerCase();
                                const isRegistered = !!event.is_registered;
                                const canView = isRegistered;
                                const isSelected = String(selectedAttendeeEvent?.attendee_id) === String(event.attendee_id);

                                return (
                                    <div
                                        key={event.event_id}
                                        style={{
                                            border: isSelected ? '2px solid #6366F1' : '1px solid #CBD5E1',
                                            borderRadius: '12px',
                                            padding: '0.9rem',
                                            background: isSelected ? '#EEF2FF' : '#F8FAFC'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <div>
                                                <p style={{ margin: 0, color: '#1E293B', fontWeight: '700' }}>{event.event_name}</p>
                                                <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.85rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CalendarDays size={14} />{event.event_date || 'TBA'}</span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} />{event.location || 'TBA'}</span>
                                                </p>
                                                <p style={{ margin: '0.35rem 0 0', color: '#334155', fontSize: '0.82rem' }}>
                                                    {isRegistered
                                                        ? `Registered • ${event.total_event_photos || 0} event photos currently available`
                                                        : `Status: ${status || 'active'}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (canView) {
                                                        setSelectedAttendeeEvent(event);
                                                        setEventStatus(event.event_status || 'active');
                                                        setEventName(event.event_name || 'Event');
                                                        handleGoToGallery(event);
                                                    } else {
                                                        handleRegisterForEvent(event.event_id);
                                                    }
                                                }}
                                                style={{
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    background: canView ? '#4F46E5' : '#0F766E',
                                                    color: '#FFFFFF',
                                                    padding: '0.55rem 0.8rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                {canView ? 'Open Event Photos' : 'Register'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                />
            </motion.div>

            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin-slow { animation: spin-slow 2s linear infinite; }
            `}</style>
        </div>
    );
};

export default AttendeeWelcome;
