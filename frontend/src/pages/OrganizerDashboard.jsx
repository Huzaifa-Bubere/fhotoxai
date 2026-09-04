import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    Plus, Settings, UserPlus, Image as ImageIcon, Share2, XCircle, Download,
    Calendar, MapPin, Users, Aperture, ChevronRight, Upload, Play, CheckCircle, Grid, Cpu, Activity, Mail, Trash2, User, Key, ArrowLeft, FolderOpen, UploadCloud, Eye, Clock, X, Loader2
} from 'lucide-react';
import '../landing.css';
import '../styles/dashboard-theme.css';
import HeroBackground from '../components/landing/HeroBackground';
import { getEventCover } from '../utils/eventConstants';
import { organizerAPI, trainingAPI, photoAPI, authAPI, API_BASE, isUnauthorizedError } from '../services/api';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import CinematicManager from '../components/photoClustering/ui/cinematic/CinematicManager';
import { getPhotoUrl } from '../utils/photoClusteringApi';

// --- Constants ---


// --- Components ---

const GlassCard = ({ children, className = "", style = {} }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card ${className}`}
        style={{
            background: 'rgba(255, 255, 255, 0.88)',
            border: '1px solid rgba(37, 30, 24, 0.08)',
            boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            ...style
        }}
    >
        {children}
    </motion.div>
);

const OrganizerDashboard = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [, setEvents] = useState([]);
    const [activeEvent, setActiveEvent] = useState(null);
    const [stats, setStats] = useState({ guests: 0, photos: 0, processed: 0 });
    const [, setProcessingStatus] = useState("idle");

    // Training State
    const [isTraining, setIsTraining] = useState(false);
    const [trainingMetrics, setTrainingMetrics] = useState({
        total_photos: 0,
        total_faces: 0,
        unique_identities: 0,
        photos_processed: 0,
        attendee_count: 0,
        photographer_count: 0,
        event_status: 'active',
        training_in_progress: false,
        completion_status: '0%'
    });

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [, setUploadProgress] = useState(0);
    const [uploadHistory, setUploadHistory] = useState([]);
    const [, setUploadStats] = useState({ totalFiles: 0, uploadedFiles: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const { addToast } = useToast();

    const loadEvents = useCallback(async (userId) => {
        try {
            const result = await organizerAPI.getEvents(userId);
            const resultEvents = result?.status === 'success' ? (result.events || []) : [];

            if (resultEvents.length > 0) {
                setEvents(resultEvents);
                let targetEvent = null;
                if (eventId) {
                    targetEvent = resultEvents.find(e => e.id.toString() === eventId.toString());
                }
                if (!targetEvent) targetEvent = resultEvents[0];
                setActiveEvent(targetEvent);

                setStats({
                    guests: targetEvent.attendee_count || targetEvent.attendees || 0,
                    photos: targetEvent.photo_count || targetEvent.total_photos || 0,
                    processed: (targetEvent.photo_count || targetEvent.total_photos || 0) > 0 ? Math.floor(Math.random() * 20 + 80) : 0
                });
            } else {
                setEvents([]);
                setActiveEvent(null);
                setStats({ guests: 0, photos: 0, processed: 0 });
            }
        } catch (error) {
            setEvents([]);
            setActiveEvent(null);
            setStats({ guests: 0, photos: 0, processed: 0 });
            if (isUnauthorizedError(error)) {
                return;
            }
            console.error("Failed to load events", error);
        }
    }, [eventId]);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('organizer_user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            loadEvents(userData.id);
        } else {
            navigate(`/organizer/login?redirect=${encodeURIComponent(location.pathname)}`);
        }
    }, [loadEvents, navigate, location.pathname]);

    // Poll for metrics
    React.useEffect(() => {
        if (!activeEvent) return;

        const fetchMetrics = async () => {
            try {
                const metrics = await trainingAPI.getMetrics(activeEvent.id);
                const eventAttendees = activeEvent.attendee_count || activeEvent.attendees || 0;
                const eventPhotographers = activeEvent.photographer_count || 1;

                setTrainingMetrics(prev => ({
                    ...prev,
                    total_photos: metrics?.total_photos ?? prev.total_photos,
                    total_faces: metrics?.total_faces ?? prev.total_faces,
                    unique_identities: metrics?.unique_identities ?? prev.unique_identities,
                    photos_processed: metrics?.unique_identities ?? 0,
                    attendee_count: eventAttendees,
                    photographer_count: eventPhotographers,
                    event_status: activeEvent.status || 'active',
                    training_in_progress: metrics?.training_in_progress || false,
                    completion_status: metrics?.completion_status || '0%'
                }));

                setIsTraining(metrics?.training_in_progress || false);
                setProcessingStatus(metrics?.training_in_progress ? "processing" : "idle");

                setStats({
                    guests: eventAttendees,
                    photos: metrics?.total_photos || activeEvent.total_photos || 0,
                    photographers: eventPhotographers,
                    processed: metrics?.unique_identities || 0
                });

                // Fetch upload history
                try {
                    const history = await photoAPI.getUploadHistory(activeEvent.id);
                    if (history && history.uploads) {
                        setUploadHistory(history.uploads);
                    }
                } catch (e) {
                    if (isUnauthorizedError(e)) {
                        return;
                    }
                    console.error("Failed to fetch upload history", e);
                }
            } catch (error) {
                if (isUnauthorizedError(error)) {
                    setIsTraining(false);
                    return;
                }
                console.error('Error fetching metrics:', error);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, [activeEvent]);

    const handleViewClusters = () => {
        if (!activeEvent) return;
        navigate(`/clusters/${activeEvent.id}`);
    };

    const formatActivityTime = (timestamp) => {
        if (!timestamp) return 'Just now';

        let timeString = timestamp;
        if (typeof timeString === 'string' && !timeString.endsWith('Z') && !timeString.includes('+')) {
            timeString = timeString.replace(' ', 'T') + 'Z';
        }

        const now = new Date();
        const then = new Date(timeString);
        const diffInMinutes = Math.floor((now - then) / (1000 * 60));

        if (diffInMinutes < 1 || isNaN(diffInMinutes)) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return then.toLocaleDateString();
    };

    const handleRunAI = () => {
        if (!activeEvent) return;
        navigate(`/photo-clustering?eventId=${activeEvent.id}`);
    };

    const handleQuickUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e, isFolder = false) => {
        const rawFiles = e.target.files;
        if (!rawFiles?.length || !activeEvent) return;

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const validFiles = Array.from(rawFiles).filter(file => {
            const lowerName = file.name.toLowerCase();
            return allowedExtensions.some(ext => lowerName.endsWith(ext));
        });

        if (validFiles.length === 0) {
            addToast('No valid images. Allowed: .jpg, .jpeg, .png, .webp', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStats({ totalFiles: validFiles.length, uploadedFiles: 0 });

        try {
            const folderName = isFolder
                ? validFiles[0]?.webkitRelativePath?.split('/')[0] || `Folder Upload`
                : `Upload_${new Date().toISOString().split('T')[0]}_${validFiles.length}`;

            const result = await photoAPI.uploadFolder(
                validFiles, folderName, activeEvent.id, user?.id?.toString() || '1',
                (percent) => {
                    setUploadProgress(percent);
                    setUploadStats(prev => ({
                        ...prev,
                        uploadedFiles: Math.floor((percent / 100) * validFiles.length)
                    }));
                }
            );
            loadEvents(user.id);
            if ((result?.failed ?? 0) > 0) {
                addToast(`Uploaded ${result.uploaded} photo(s). ${result.failed} failed.`, 'info');
            } else {
                addToast(result.message || `Successfully uploaded ${result.uploaded} photo(s).`, 'success');
            }
        } catch (error) {
            addToast(`Upload Failed: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer?.files;
        if (files?.length) {
            handleFileSelect({ target: { files } }, false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [, setSelectedEventForQR] = useState(null);
    const [inviteEmails, setInviteEmails] = useState('');
    const [isSendingInvites, setIsSendingInvites] = useState(false);

    // Staff Modal State
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [assignedPhotographers, setAssignedPhotographers] = useState([]);
    const [availablePhotographers, setAvailablePhotographers] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [activeStaffTab, setActiveStaffTab] = useState('assigned');
    const [newPhotographerData, setNewPhotographerData] = useState({ name: '', email: '', password: '' });
    const [isCreatingPhotographer, setIsCreatingPhotographer] = useState(false);

    // Settings Modal State
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Confirmation Modal State
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger', // default
        confirmText: 'Confirm'
    });
    const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

    const closeConfirmationModal = () => {
        setConfirmationModal(current => ({ ...current, isOpen: false }));
    };

    const openConfirmationModal = ({ title, message, onConfirm, type = 'danger', confirmText = 'Confirm' }) => {
        setConfirmationModal({
            isOpen: true,
            title,
            message,
            onConfirm,
            type,
            confirmText
        });
    };

    const handleToggleStatus = async () => {
        if (!activeEvent) return;
        const newStatus = trainingMetrics.event_status === 'active' ? 'closed' : 'active';
        try {
            await organizerAPI.updateEventStatus(activeEvent.id, newStatus);
            addToast(`Event is now ${newStatus.toUpperCase()}`, "success");
            setTrainingMetrics(prev => ({ ...prev, event_status: newStatus }));
        } catch (_error) {
            addToast(`Failed to update status: ${_error.message}`, "error");
        }
    };

    const handleDownload = () => {
        if (!activeEvent) return;
        addToast("Preparing download package...", "processing");
        const downloadBase = '/api';
        window.location.href = `${downloadBase}/events/${activeEvent.id}/download-zip`;
    };

    const fetchPhotographers = useCallback(async () => {
        if (!activeEvent) return;
        setLoadingStaff(true);
        try {
            const result = await organizerAPI.getPhotographersByEvent(activeEvent.id);
            if (result.status === 'success') {
                setAssignedPhotographers(result.assigned || []);
                setAvailablePhotographers(result.available || []);
            } else {
                setAssignedPhotographers([]);
                setAvailablePhotographers([]);
            }
        } catch (_error) {
            setAssignedPhotographers([]);
            setAvailablePhotographers([]);
        } finally {
            setLoadingStaff(false);
        }
    }, [activeEvent]);

    const openStaffModal = (initialTab = 'assigned') => {
        setActiveStaffTab(initialTab);
        setShowStaffModal(true);
        fetchPhotographers();
    };

    React.useEffect(() => {
        if (!activeEvent) {
            setAssignedPhotographers([]);
            setAvailablePhotographers([]);
            return;
        }

        fetchPhotographers();
    }, [activeEvent, fetchPhotographers]);

    const handleRemovePhotographer = async (photographerId) => {
        if (!activeEvent) return;

        openConfirmationModal({
            title: 'Remove Photographer',
            message: 'Are you sure you want to remove this photographer from the event?',
            type: 'danger',
            confirmText: 'Remove',
            onConfirm: async () => {
                setIsConfirmProcessing(true);
                try {
                    const result = await organizerAPI.removePhotographerFromEvent(activeEvent.id, photographerId);
                    if (result.status === 'success') {
                        addToast('Photographer removed.', 'success');
                        await fetchPhotographers();
                        if (user?.id) {
                            await loadEvents(user.id);
                        }
                        closeConfirmationModal();
                    } else {
                        addToast(result.message || 'Failed to remove.', 'error');
                    }
                } catch (_error) {
                    addToast('Failed to remove.', 'error');
                } finally {
                    setIsConfirmProcessing(false);
                }
            }
        });
    };

    const handleCreatePhotographer = async () => {
        if (!newPhotographerData.name || !newPhotographerData.email || !newPhotographerData.password) {
            addToast('Please fill in all fields.', 'error');
            return;
        }

        setIsCreatingPhotographer(true);
        try {
            const result = await organizerAPI.createPhotographer(newPhotographerData);
            if (result.status === 'success') {
                addToast('Photographer created using email: ' + newPhotographerData.email, 'success');
                addToast('Photographer should sign in from the Photographer Login portal using the same password.', 'info');
                // Auto assign newly created photographer
                if (result.user_id) {
                    await organizerAPI.assignPhotographerToEvent(activeEvent.id, result.user_id);
                    addToast('Photographer assigned to event.', 'success');
                }
                setNewPhotographerData({ name: '', email: '', password: '' });
                setActiveStaffTab('assigned');
                await fetchPhotographers();
                if (user?.id) {
                    await loadEvents(user.id);
                }
            } else {
                addToast(result.message || 'Failed to create account.', 'error');
            }
        } catch (_error) {
            addToast(_error.message || 'Failed to create account.', 'error');
        } finally {
            setIsCreatingPhotographer(false);
        }
    };

    const handleAssignPhotographer = async (photographerId) => {
        if (!activeEvent) return;
        try {
            const result = await organizerAPI.assignPhotographerToEvent(activeEvent.id, photographerId);
            if (result.status === 'success') {
                addToast('Photographer assigned.', 'success');
                setActiveStaffTab('assigned');
                await fetchPhotographers();
                if (user?.id) {
                    await loadEvents(user.id);
                }
            } else {
                addToast('Failed to assign.', 'error');
            }
        } catch (_error) {
            addToast('Failed to assign.', 'error');
        }
    };

    // Missing state for settings - adding it here to prevent errors
    const [settings, setSettings] = useState({ organizationName: '' });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Event Highlight Reel State
    const [showHighlights, setShowHighlights] = useState(false);
    const [highlightPhotos, setHighlightPhotos] = useState([]);
    const [isFetchingHighlights, setIsFetchingHighlights] = useState(false);

    const handleViewHighlights = async () => {
        if (!activeEvent) return;
        setIsFetchingHighlights(true);
        try {
            const data = await organizerAPI.getEventHighlightReel(activeEvent.id, 50);
            if (data.status === 'success' && data.faces && data.faces.length > 0) {
                const urls = data.faces.map(f => f.photo_url.startsWith('http') ? f.photo_url : getPhotoUrl(f.photo_url));
                setHighlightPhotos(urls);
                setShowHighlights(true);
            } else {
                addToast("No highlight photos found yet.", "info");
            }
        } catch (err) {
            console.error("Failed to load highlights", err);
            addToast("Failed to load highlight reel.", "error");
        } finally {
            setIsFetchingHighlights(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 800));
        localStorage.setItem('organizer_settings', JSON.stringify(settings));
        setIsSavingSettings(false);
        setShowSettingsModal(false);
        addToast('Settings saved successfully.', 'success');
    };

    // --- specialized components for the new layout ---

    const MetricCard = ({ label, value, subtext, icon: Icon, trend }) => (
        <div style={{ background: 'rgba(255, 255, 255, 0.88)', border: '1px solid rgba(37, 30, 24, 0.08)', borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#666666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <Icon size={16} style={{ color: '#f5821f' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1f1f1f', fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>{value}</div>
            {subtext && <div style={{ fontSize: '0.85rem', color: trend === 'up' ? '#059669' : '#666666', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {trend === 'up' && <span style={{ fontSize: '1rem' }}>↑</span>} {subtext}
            </div>}
        </div>
    );

    const SettingsSection = () => (
        <div style={{ background: 'rgba(255, 255, 255, 0.88)', border: '1px solid rgba(37, 30, 24, 0.08)', borderRadius: '1.25rem', padding: '1rem', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f1f1f', marginBottom: '0.75rem', fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: '#FFF5EB', border: '1px solid rgba(245,130,31,0.2)', borderRadius: '8px', color: '#d86d13', cursor: 'pointer', textAlign: 'left' }}>
                    <Download size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Download All Photos</span>
                </button>
                <button onClick={handleQuickUpload} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: '#FFF8F2', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '8px', color: '#666666', cursor: 'pointer', textAlign: 'left' }}>
                    <Upload size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Quick Upload</span>
                </button>
                <div style={{ height: '1px', background: '#E2E8F0', margin: '0.25rem 0' }} />
                <button 
                    onClick={handleViewHighlights} 
                    disabled={isFetchingHighlights} 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)', border: 'none', borderRadius: '8px', color: 'white', cursor: isFetchingHighlights ? 'not-allowed' : 'pointer', textAlign: 'left', boxShadow: '0 4px 12px -4px rgba(217, 109, 19, 0.4)' }}
                >
                    {isFetchingHighlights ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} 
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Event Highlight Reel</span>
                </button>
                <div style={{ height: '1px', background: '#E2E8F0', margin: '0.25rem 0' }} />
                <button onClick={() => openStaffModal('available')} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: '#FFF8F2', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '8px', color: '#666666', cursor: 'pointer', textAlign: 'left' }}>
                    <UserPlus size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Assign Photographer</span>
                </button>
                <button onClick={() => setShowSettingsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: '#FFF8F2', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '8px', color: '#666666', cursor: 'pointer', textAlign: 'left' }}>
                    <Settings size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Event Settings</span>
                </button>
                <div style={{ height: '1px', background: '#E2E8F0', margin: '0.25rem 0' }} />
                <button onClick={handleToggleStatus} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.6rem', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', textAlign: 'left' }}>
                    <XCircle size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{trainingMetrics.event_status === 'active' ? "End Event" : "Re-open Event"}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="dashboard-themed" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: '70px',
            boxSizing: 'border-box'
        }}>
            <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
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

                {/* Header */}
                <header style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    borderBottom: '1px solid rgba(37, 30, 24, 0.08)',
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(16px)',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/organizer/events')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#666666',
                                background: 'transparent',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                fontSize: '0.95rem',
                                padding: '0.5rem',
                                borderRadius: '8px',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.color = '#1f1f1f';
                                e.currentTarget.style.background = '#FFF5EB';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.color = '#666666';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <div style={{ height: '32px', width: '1px', background: '#E2E8F0', margin: '0 0.5rem' }} />
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f1f1f', margin: 0, fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
                                    {activeEvent?.name || "Loading..."}
                                </h1>
                                {activeEvent && (
                                    <>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#64748B' }}>
                                            {activeEvent.event_id}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            padding: '0.2rem 0.5rem', borderRadius: '4px',
                                            background: activeEvent.status === 'active' ? '#DCFCE7' : '#f5f1ec',
                                            color: activeEvent.status === 'active' ? '#166534' : '#666666'
                                        }}>
                                            {activeEvent.status === 'active' ? 'Live' : 'Closed'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{
                    flex: 1,
                    padding: '1rem',
                    position: 'relative',
                    zIndex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}>
                    <div className="dashboard-main-grid">

                        {/* LEFT COLUMN: Main Workflow */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minWidth: 0 }}>

                            {/* Enhanced Status Banner */}
                            {/* ... (commented out code kept for reference if needed, omitted here for brevity) ... */}

                            {/* 1. Hero / Metrics Row */}
                            <div className="dashboard-metrics-grid">
                                <MetricCard
                                    label="Total Photos"
                                    value={trainingMetrics.total_photos || stats.photos || 0}
                                    icon={ImageIcon}
                                    subtext="Images in database"
                                />
                                <MetricCard
                                    label="Guests Identified"
                                    value={trainingMetrics.unique_identities || 0}
                                    icon={Users}
                                    subtext={`${trainingMetrics.attendee_count || stats.guests || 0} Registered`}
                                    trend="up"
                                />
                                <MetricCard
                                    label="Processing Status"
                                    value={isTraining ? "Running" : "Idle"}
                                    icon={isTraining ? Play : CheckCircle}
                                    subtext={isTraining ? "AI is analyzing..." : "System ready"}
                                />
                            </div>

                            {/* 2. Primary Actions Area */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {/* Run AI Processing Card */}
                                <motion.button
                                    whileHover={{ translateY: -2 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={handleRunAI}
                                    disabled={isUploading}
                                    style={{
                                        background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)',
                                        borderRadius: '1.25rem', padding: '1.5rem',
                                        display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start',
                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                        boxShadow: '0 10px 15px -3px rgba(217, 109, 19, 0.3)',
                                        position: 'relative', overflow: 'hidden',
                                        minHeight: '160px', width: '100%'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.2 }}>
                                        <Cpu size={100} color="white" />
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                                        <Play size={20} color="white" />
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'white', marginBottom: '0.1rem' }}>Identify People</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>Process photos to identify guest identities.</p>
                                    </div>
                                    {isTraining && (
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', marginTop: '0.5rem' }}>
                                            <motion.div
                                                initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2, repeat: Infinity }}
                                                style={{ height: '100%', background: 'white', borderRadius: '2px' }}
                                            />
                                        </div>
                                    )}
                                </motion.button>
                                <input type="file" ref={fileInputRef} multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, false)} />
                                <input type="file" ref={folderInputRef} multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, true)} {...{ webkitdirectory: '', directory: '' }} />

                                {/* View Clusters Card */}
                                <motion.button
                                    whileHover={{ translateY: -2 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={handleViewClusters}
                                    disabled={isUploading}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.88)',
                                        border: '1px solid rgba(37, 30, 24, 0.08)',
                                        borderRadius: '1.25rem', padding: '1.5rem',
                                        display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start',
                                        cursor: 'pointer', textAlign: 'left',
                                        boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)',
                                        position: 'relative', overflow: 'hidden',
                                        minHeight: '160px', width: '100%'
                                    }}
                                >
                                    <div style={{ background: '#FFF5EB', padding: '0.6rem', borderRadius: '10px' }}>
                                        <Grid size={20} color="#f5821f" />
                                    </div>
                                    <div style={{ marginTop: 'auto' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1f1f1f', marginBottom: '0.1rem' }}>
                                            View Groups
                                        </h3>
                                        <p style={{ color: '#666666', fontSize: '0.85rem' }}>Review identified identities.</p>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ translateY: -2 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => openStaffModal(availablePhotographers.length > 0 ? 'available' : 'create')}
                                    disabled={isUploading}
                                    style={{
                                        background: 'linear-gradient(135deg, #FFF5EB 0%, rgba(255,255,255,0.88) 100%)',
                                        border: '1px solid rgba(245,130,31,0.2)',
                                        borderRadius: '1.25rem', padding: '1.5rem',
                                        display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start',
                                        cursor: 'pointer', textAlign: 'left',
                                        boxShadow: '0 4px 12px -4px rgba(217, 109, 19, 0.15)',
                                        position: 'relative', overflow: 'hidden',
                                        minHeight: '160px', width: '100%'
                                    }}
                                >
                                    <div style={{ background: '#d86d13', padding: '0.6rem', borderRadius: '10px' }}>
                                        <UserPlus size={20} color="white" />
                                    </div>
                                    <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.25rem 0.65rem',
                                            borderRadius: '999px',
                                            background: '#FFFFFF',
                                            border: '1px solid #E2E8F0',
                                            color: '#d86d13',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {activeEvent?.name || 'Current Event'}
                                        </div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1f1f1f', marginBottom: '0.1rem' }}>
                                            Assign Photographer
                                        </h3>
                                        <p style={{ color: '#666666', fontSize: '0.85rem' }}>
                                            {assignedPhotographers.length > 0
                                                ? `${assignedPhotographers.length} photographer${assignedPhotographers.length > 1 ? 's are' : ' is'} assigned to this event.`
                                                : 'Link a photographer to this event so they can upload photos.'}
                                        </p>
                                    </div>
                                </motion.button>
                            </div>

                            {/* 3. Upload Photos Section */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.88)',
                                border: '1px solid rgba(37, 30, 24, 0.08)',
                                borderRadius: '1.25rem',
                                padding: '1.5rem',
                                boxShadow: '0 4px 12px -6px rgba(66, 35, 5, 0.18)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
                                        <Upload size={18} color="#f5821f" /> Upload Photos
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B', background: '#F1F5F9', padding: '0.25rem 0.75rem', borderRadius: '100px', fontWeight: '600' }}>
                                        {uploadHistory.filter(j => !j.attendee_id).length} Uploads
                                    </span>
                                </div>

                                {/* Drag and Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={handleQuickUpload}
                                    style={{
                                        border: `2px dashed ${isDragging ? '#f5821f' : 'rgba(37,30,24,0.15)'}`,
                                        borderRadius: '12px',
                                        padding: '2rem 1rem',
                                        textAlign: 'center',
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        background: isDragging ? '#FFF5EB' : '#fffdf9',
                                        transition: 'all 0.2s',
                                        marginBottom: '1rem',
                                        opacity: isUploading ? 0.5 : 1,
                                        pointerEvents: isUploading ? 'none' : 'auto'
                                    }}
                                >
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: isDragging ? '#FDDCB5' : '#FFF5EB',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 0.75rem', color: '#f5821f'
                                    }}>
                                        <UploadCloud size={24} />
                                    </div>
                                    <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f1f1f', margin: '0 0 0.25rem' }}>
                                        {isDragging ? 'Drop photos here' : 'Drag & drop photos here'}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: '#999999', margin: 0 }}>
                                        or click to browse · JPG, PNG, WEBP
                                    </p>
                                </div>

                                {/* Action Buttons Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <button
                                        onClick={handleQuickUpload}
                                        disabled={isUploading}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.75rem', borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)',
                                            border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            boxShadow: '0 4px 6px -1px rgba(217, 109, 19, 0.3)',
                                            opacity: isUploading ? 0.5 : 1
                                        }}
                                    >
                                        <ImageIcon size={16} /> Upload Photos
                                    </button>
                                    <button
                                        onClick={() => folderInputRef.current?.click()}
                                        disabled={isUploading}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.75rem', borderRadius: '10px',
                                            background: 'white',
                                            border: '1px solid rgba(37,30,24,0.08)', color: '#666666', fontWeight: '600', cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            opacity: isUploading ? 0.5 : 1
                                        }}
                                    >
                                        <FolderOpen size={16} /> Upload Folder
                                    </button>
                                </div>

                                {/* Upload History Table */}
                                {uploadHistory.filter(j => !j.attendee_id).length > 0 && (
                                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: '700', marginBottom: '0.75rem' }}>Upload History</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '240px', overflowY: 'auto' }}>
                                            {uploadHistory.filter(j => !j.attendee_id).slice(0, 10).map((job, i) => {
                                                const status = job.status?.toLowerCase() || '';
                                                const isDone = status === 'completed' || status === 'success' || status === 'done';
                                                const isFailed = status === 'failed' || status === 'error';
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0', borderBottom: '1px solid #F8FAFC' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                                            background: isDone ? '#ECFDF5' : isFailed ? '#FEF2F2' : '#FFF5EB',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <FolderOpen size={14} color={isDone ? '#059669' : isFailed ? '#DC2626' : '#f5821f'} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#1f1f1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {job.folder_name || 'Manual Upload'}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#999999' }}>
                                                                {job.photos_uploaded || 0} photos · {formatActivityTime(job.created_at || job.started_at)}
                                                            </div>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '100px',
                                                            background: isDone ? '#ECFDF5' : isFailed ? '#FEF2F2' : '#FFFBEB',
                                                            color: isDone ? '#059669' : isFailed ? '#DC2626' : '#B45309',
                                                            border: `1px solid ${isDone ? '#D1FAE5' : isFailed ? '#FCA5A5' : '#FDE68A'}`,
                                                            textTransform: 'uppercase', letterSpacing: '0.03em'
                                                        }}>
                                                            {isDone ? 'Done' : isFailed ? 'Failed' : 'Processing'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {/* Guest Uploads Card */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.88)',
                                    border: '1px solid rgba(37, 30, 24, 0.08)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    height: '300px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={16} /> Guest Uploads
                                        </h3>
                                        <span style={{ fontSize: '0.75rem', color: '#999999', background: '#FFF5EB', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                                            {uploadHistory.filter(j => j.attendee_id).length} Uploads
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto' }}>
                                        {uploadHistory.filter(j => j.attendee_id).length > 0 ? (
                                            uploadHistory.filter(j => j.attendee_id).slice(0, 10).map((job, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF5EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <ImageIcon size={14} color="#f5821f" />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f1f1f' }}>
                                                            {job.attendee_name || job.attendee_email || "Guest Upload"}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#999999' }}>{job.photos_uploaded || 0} photos • {formatActivityTime(job.created_at || job.started_at)}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#999999', fontSize: '0.9rem' }}>
                                                No guest uploads yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Activity Card */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.88)',
                                    border: '1px solid rgba(37, 30, 24, 0.08)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    height: '300px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f1f1f' }}>Recent Activity</h3>
                                        <button style={{ color: '#d86d13', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>View All</button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto' }}>
                                        {uploadHistory.filter(j => !j.attendee_id).length > 0 ? (
                                            uploadHistory.filter(j => !j.attendee_id).slice(0, 10).map((job, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF5EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <ImageIcon size={14} color="#f5821f" />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f1f1f' }}>{job.folder_name || 'Manual Upload'}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#999999' }}>{job.photos_uploaded || 0} photos uploaded</div>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#999999' }}>{formatActivityTime(job.created_at || job.started_at)}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#999999', fontSize: '0.9rem' }}>
                                                No recent upload activity.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Sidebar (Narrower) */}
                        <div className="dashboard-sidebar">

                            {/* QR Code Card */}
                            <div style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(37, 30, 24, 0.08)', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ padding: '0.75rem', background: 'linear-gradient(to bottom right, #d86d13, #f5821f)', color: 'white', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.2rem' }}>Guest Registration</h3>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Scan to register</p>
                                </div>
                                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', background: 'white' }}>
                                    {activeEvent && (
                                        <img
                                            src={activeEvent.qr_code_path ? `${API_BASE}${activeEvent.qr_code_path}` : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/attendee/access?eventId=${activeEvent.id}`)}`}
                                            style={{ width: '140px', height: '140px', mixBlendMode: 'multiply' }}
                                            alt="QR"
                                        />
                                    )}
                                </div>
                                <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(37,30,24,0.08)', background: '#FFF8F2' }}>
                                    <button onClick={() => { setSelectedEventForQR(activeEvent); setShowShareModal(true); }} style={{ width: '100%', padding: '0.5rem', background: 'white', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '6px', color: '#1f1f1f', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.2s' }}>
                                        Expand
                                    </button>
                                </div>
                            </div>

                            {/* Event Details Card */}
                            <div style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(37, 30, 24, 0.08)', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ height: '80px', width: '100%', position: 'relative' }}>
                                    <img
                                        src={activeEvent?.cover_image || getEventCover(activeEvent?.id)}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80';
                                        }}
                                        alt="banner"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
                                </div>
                                <div style={{ padding: '1rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f1f1f', marginBottom: '0.75rem' }}>Event Details</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Calendar size={14} color="#999999" />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#1f1f1f' }}>{activeEvent ? new Date(activeEvent.date).toLocaleDateString() : '...'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <MapPin size={14} color="#999999" />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#1f1f1f' }}>{activeEvent?.location || 'Unspecified'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Settings / Quick Actions */}
                            {/* Removed SettingsSection per user request */}
                        </div>
                    </div>

                    <style>{`
                    .dashboard-main-grid {
                        display: grid;
                        gap: 1.5rem;
                        grid-template-columns: 1fr; /* Mobile First: Stacked */
                    }
                    
                    .dashboard-metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 1rem;
                    }
                    
                    .dashboard-sidebar {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    @media (min-width: 1024px) {
                        .dashboard-main-grid {
                            grid-template-columns: minmax(0, 1fr) 300px; /* Desktop: Wide Left, Narrow Right */
                            align-items: start;
                        }
                        
                        .dashboard-metrics-grid {
                            grid-template-columns: repeat(3, 1fr);
                        }
                    }
                    
                    @media (min-width: 1440px) {
                        .dashboard-main-grid {
                            grid-template-columns: minmax(0, 1fr) 340px; /* Even wider screens */
                        }
                    }
                `}</style>
                </div>

                {/* Modals - (Kept same as before, simplified for brevity here) */}
                <AnimatePresence>
                    {showShareModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowShareModal(false)}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                style={{ width: '90%', maxWidth: '450px', padding: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <h2 style={{ fontSize: '1.25rem', color: '#1f1f1f', fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>Share Event Access</h2>
                                {activeEvent && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ background: '#FFF8F2', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem', border: '1px dashed rgba(245,130,31,0.25)' }}>
                                            <img
                                                src={activeEvent.qr_code_path ? `${API_BASE}${activeEvent.qr_code_path}` : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/attendee/access?eventId=${activeEvent.id}`)}`}
                                                alt="QR Code"
                                                style={{ width: '200px', height: '200px', mixBlendMode: 'multiply' }}
                                            />
                                        </div>
                                        <p style={{ color: '#666666', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                            Scanning this QR code will take guests directly to the secure registration page.
                                        </p>

                                        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(37,30,24,0.08)', paddingTop: '1.5rem', textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f1f1f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Mail size={16} /> Send via Email
                                            </h3>
                                            <textarea
                                                placeholder="Enter email addresses (comma separated)..."
                                                value={inviteEmails}
                                                onChange={(e) => setInviteEmails(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '0.75rem', borderRadius: '8px',
                                                    border: '1px solid rgba(245,130,31,0.18)', fontSize: '0.9rem', minHeight: '80px',
                                                    fontFamily: 'inherit', marginBottom: '1rem', outline: 'none',
                                                    background: '#fffdf9'
                                                }}
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!activeEvent) return;
                                                    setIsSendingInvites(true);
                                                    try {
                                                        const result = await authAPI.sendInvitations(inviteEmails, activeEvent.id);
                                                        if (result.status === 'success') {
                                                            addToast('Invitations sent successfully.', 'success');
                                                            setInviteEmails('');
                                                            setShowShareModal(false);
                                                        } else {
                                                            addToast(result.message || 'Failed to send invitations.', 'error');
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        addToast('Failed to send invitations.', 'error');
                                                    } finally {
                                                        setIsSendingInvites(false);
                                                    }
                                                }}
                                                disabled={isSendingInvites || !inviteEmails.trim()}
                                                style={{
                                                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                                                    background: isSendingInvites ? '#999999' : '#f5821f', color: 'white', fontWeight: '600',
                                                    cursor: isSendingInvites ? 'wait' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                {isSendingInvites ? 'Sending...' : 'Send Invitations'}
                                            </button>
                                        </div>
                                        <button onClick={() => setShowShareModal(false)} style={{
                                            marginTop: '1.5rem',
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#FEF2F2',
                                            border: '1px solid #FEE2E2',
                                            borderRadius: '8px',
                                            color: '#EF4444',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                            Close
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                    {showStaffModal && (<div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowStaffModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '90%', maxWidth: '600px', padding: '0', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }} onClick={e => e.stopPropagation()} >

                            {/* Modal Header */}
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', color: '#1f1f1f', margin: 0, fontWeight: '700' }}>Manage Team</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#666666', marginTop: '0.2rem' }}>{activeEvent?.name}</p>
                                </div>
                                <button onClick={() => setShowStaffModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999999' }}><XCircle size={20} /></button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(37,30,24,0.08)' }}>
                                <button onClick={() => setActiveStaffTab('assigned')} style={{ flex: 1, padding: '1rem', background: activeStaffTab === 'assigned' ? 'white' : '#FFF8F2', border: 'none', borderBottom: activeStaffTab === 'assigned' ? '2px solid #f5821f' : 'none', color: activeStaffTab === 'assigned' ? '#d86d13' : '#666666', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>Assigned ({assignedPhotographers.length})</button>
                                <button onClick={() => setActiveStaffTab('available')} style={{ flex: 1, padding: '1rem', background: activeStaffTab === 'available' ? 'white' : '#FFF8F2', border: 'none', borderBottom: activeStaffTab === 'available' ? '2px solid #f5821f' : 'none', color: activeStaffTab === 'available' ? '#d86d13' : '#666666', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>Add Existing</button>
                                <button onClick={() => setActiveStaffTab('create')} style={{ flex: 1, padding: '1rem', background: activeStaffTab === 'create' ? 'white' : '#FFF8F2', border: 'none', borderBottom: activeStaffTab === 'create' ? '2px solid #f5821f' : 'none', color: activeStaffTab === 'create' ? '#d86d13' : '#666666', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>Create New</button>
                            </div>

                            {/* Content Area */}
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                {loadingStaff ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#999999' }}>
                                        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(37,30,24,0.08)', borderTopColor: '#f5821f', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                                        Loading staff data...
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. ASSIGNED TAB */}
                                        {activeStaffTab === 'assigned' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {assignedPhotographers.length > 0 ? (
                                                    assignedPhotographers.map(p => (
                                                        <div key={p.id} style={{ padding: '1rem', background: 'white', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.2s' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF5EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d86d13', fontWeight: '600' }}>
                                                                    {p.full_name ? p.full_name[0].toUpperCase() : 'P'}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#1f1f1f', fontSize: '0.95rem' }}>{p.full_name || p.username}</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#666666' }}>{p.email}</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemovePhotographer(p.id)}
                                                                style={{ padding: '0.5rem', color: '#EF4444', background: '#FEF2F2', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                                                                title="Remove from event"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#FFF8F2', borderRadius: '12px', border: '1px dashed rgba(245,130,31,0.25)' }}>
                                                        <Users size={48} color="#999999" style={{ marginBottom: '1rem' }} />
                                                        <p style={{ color: '#666666', fontWeight: '500' }}>No photographers assigned yet.</p>
                                                        <button onClick={() => setActiveStaffTab('available')} style={{ marginTop: '1rem', color: '#d86d13', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Add one now</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 2. AVAILABLE TAB */}
                                        {activeStaffTab === 'available' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {availablePhotographers.length > 0 ? (
                                                    availablePhotographers.map(p => (
                                                        <div key={p.id} style={{ padding: '1rem', border: '1px solid rgba(37,30,24,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF5EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d86d13', fontWeight: '600' }}>
                                                                    {p.full_name ? p.full_name[0].toUpperCase() : 'U'}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#1f1f1f', fontSize: '0.95rem' }}>{p.full_name || p.username}</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#999999' }}>{p.email}</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAssignPhotographer(p.id)}
                                                                style={{ background: 'white', border: '1px solid rgba(37,30,24,0.08)', color: '#1f1f1f', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                            >
                                                                <Plus size={16} /> Assign
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#FFF8F2', borderRadius: '12px', border: '1px dashed rgba(245,130,31,0.25)' }}>
                                                        <p style={{ color: '#999999' }}>No other photographers found.</p>
                                                        <button onClick={() => setActiveStaffTab('create')} style={{ marginTop: '0.5rem', color: '#d86d13', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Create a new account</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. CREATE TAB */}
                                        {activeStaffTab === 'create' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', color: '#9A3412', display: 'flex', gap: '0.75rem' }}>
                                                    <UserPlus size={18} style={{ flexShrink: 0 }} />
                                                    This will create a new user account with the "Photographer" role and automatically assign them to this event.
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem' }}>Full Name</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#999999' }} />
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Jane Doe"
                                                            value={newPhotographerData.name}
                                                            onChange={e => setNewPhotographerData({ ...newPhotographerData, name: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', outline: 'none', background: '#fffdf9' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem' }}>Email Address</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#999999' }} />
                                                        <input
                                                            type="email"
                                                            placeholder="photographer@example.com"
                                                            value={newPhotographerData.email}
                                                            onChange={e => setNewPhotographerData({ ...newPhotographerData, email: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', outline: 'none', background: '#fffdf9' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem' }}>Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#999999' }} />
                                                        <input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            value={newPhotographerData.password}
                                                            onChange={e => setNewPhotographerData({ ...newPhotographerData, password: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', outline: 'none', background: '#fffdf9' }}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleCreatePhotographer}
                                                    disabled={isCreatingPhotographer}
                                                    style={{
                                                        marginTop: '1rem',
                                                        padding: '0.85rem',
                                                        background: isCreatingPhotographer ? '#999999' : '#f5821f',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: '600',
                                                        cursor: isCreatingPhotographer ? 'wait' : 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                        boxShadow: '0 4px 6px -1px rgba(217, 109, 19, 0.3)'
                                                    }}
                                                >
                                                    {isCreatingPhotographer ? 'Creating...' : 'Create & Assign Photographer'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>)}
                    {showSettingsModal && (<div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSettingsModal(false)}> <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '90%', maxWidth: '450px', padding: '0', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()} > <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(37,30,24,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> <h2 style={{ fontSize: '1.1rem', color: '#1f1f1f', margin: 0, fontWeight: '700' }}>Event Settings</h2> <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999999' }}><XCircle size={20} /></button> </div> <div style={{ padding: '1.5rem' }}> <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666666', fontSize: '0.9rem', fontWeight: '600' }}>Organization / Host Name</label> <input type="text" value={settings.organizationName} onChange={e => setSettings({ ...settings, organizationName: e.target.value })} className="saas-input" style={{ width: '100%', padding: '0.75rem', background: '#fffdf9', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', color: '#1f1f1f', marginBottom: '1.5rem', outline: 'none' }} placeholder="e.g. Acme Corp" /> <button onClick={handleSaveSettings} style={{ width: '100%', padding: '0.75rem', background: '#f5821f', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(217, 109, 19, 0.3)' }}> {isSavingSettings ? 'Saving...' : 'Save Changes'} </button> </div> </motion.div> </div>)}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onClose={closeConfirmationModal}
                    onConfirm={confirmationModal.onConfirm}
                    title={confirmationModal.title}
                    message={confirmationModal.message}
                    type={confirmationModal.type}
                    confirmText={confirmationModal.confirmText}
                    isLoading={isConfirmProcessing}
                />

                {/* Cinematic Manager Modal for Highlight Reel */}
                <AnimatePresence>
                    {showHighlights && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 99999,
                                background: 'rgba(0, 0, 0, 0.95)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem'
                            }}
                            onClick={() => setShowHighlights(false)}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '1200px',
                                    aspectRatio: '16/9',
                                    background: '#000',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <CinematicManager
                                    initialPhotos={highlightPhotos}
                                    onClose={() => setShowHighlights(false)}
                                    mode="modal"
                                    eventName={activeEvent?.name || "Event Highlight Reel"}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const dashboardStyles = `
.dashboard-main-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
    align-items: start;
}
.dashboard-sidebar {
    position: sticky;
    top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}
.dashboard-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
}
@media (max-width: 1280px) {
    .dashboard-main-grid {
        grid-template-columns: 1fr 300px;
        gap: 1.5rem;
    }
}
@media (max-width: 1024px) {
    .dashboard-main-grid {
        grid-template-columns: 1fr;
    }
    .dashboard-sidebar {
        position: static;
    }
    .dashboard-metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.innerText = dashboardStyles;
document.head.appendChild(styleSheet);

export default OrganizerDashboard;
