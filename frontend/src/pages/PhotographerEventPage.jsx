import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    Upload, Calendar, MapPin, ArrowLeft, CheckCircle,
    FolderOpen, Image as ImageIcon, Clock, FileText,
    UploadCloud, HardDrive, Trash2, Eye, Layout, ChevronRight,
    MoreHorizontal, Camera, LogOut, Home, Bell, AlertCircle, Cpu, X, AlertTriangle
} from 'lucide-react';
import '../landing.css';
import AILoader from '../components/ui/AILoader';
import { eventAPI, photoAPI, API_BASE, AUTH_EXPIRED_EVENT, clearStoredAuth } from '../services/api';
import { getPhotoUrl } from '../utils/photoClusteringApi';
import { useToast } from '../context/ToastContext';

// --- Shared Components (Mature SaaS) ---

const StandardCard = ({ children, style = {} }) => (
    <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style
    }}>
        {children}
    </div>
);

const UploadActionCard = ({ title, description, icon: Icon, onClick, color = 'indigo', disabled = false, style = {} }) => {
    const colorMap = {
        indigo: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
        blue: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' }
    };
    const theme = colorMap[color];

    return (
        <motion.button
            whileHover={disabled ? {} : { y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
            whileTap={disabled ? {} : { scale: 0.99 }}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'left',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                width: '100%',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
                ...style
            }}
        >
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                background: theme.text
            }} />

            <div style={{
                width: '56px', height: '56px',
                borderRadius: '12px',
                background: theme.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.text,
                border: `1px solid ${theme.border}`
            }}>
                <Icon size={28} />
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5 }}>{description}</p>
            </div>
        </motion.button>
    );
};

const StatItem = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
        <div style={{ color: '#64748B' }}><Icon size={18} /></div>
        <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94A3B8', marginTop: '0.25rem' }}>{label}</div>
        </div>
    </div>
);

const PhotographerEventPage = () => {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const { addToast } = useToast();
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(null);
    const [uploadJobs, setUploadJobs] = useState([]);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStats, setUploadStats] = useState({
        totalFiles: 0,
        uploadedFiles: 0
    });
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    // Upload Complete Modal State
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);

    // Folder View/Delete State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [folderPhotos, setFolderPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAuthExpired = () => {
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
            detail: {
                message: 'Your session expired. Please log in again.',
            },
        }));
    };

    const handleViewFolder = async (folderName) => {
        setSelectedFolder(folderName);
        setShowViewModal(true);
        setLoadingPhotos(true);
        try {
            const data = await photoAPI.getFolderPhotos(null, eventId, folderName);
            setFolderPhotos(data || []);
        } catch (error) {
            console.error("Failed to load photos:", error);
            addToast("Failed to load photos", "error");
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleDeleteFolder = async () => {
        if (!folderToDelete) return;
        setIsDeleting(true);
        try {
            await photoAPI.deleteFolder(folderToDelete, eventId);
            addToast("Folder deleted successfully", "success");
            setShowDeleteModal(false);
            setFolderToDelete(null);
            await loadUploadHistory();
            await loadEventData();
        } catch (error) {
            console.error("Failed to delete folder:", error);
            addToast("Failed to delete folder", "error");
        } finally {
            setIsDeleting(false);
        }
    };


    useEffect(() => {
        const storedUser = localStorage.getItem('photographer_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        loadEventData();
    }, [eventId]);

    // Polling for active uploads to show live stats
    useEffect(() => {
        let interval;
        const hasActiveJobs = uploadJobs.some(job =>
            ['uploading', 'processing', 'in_progress', 'queued'].includes(job.status?.toLowerCase())
        );

        if (isUploading || hasActiveJobs) {
            interval = setInterval(() => {
                loadUploadHistory();
            }, 3000); // Poll every 3 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isUploading, uploadJobs]);

    const loadEventData = async () => {
        try {
            const result = await eventAPI.getById(eventId);
            if (result && result.event) {
                setEvent(result.event);
            } else if (result) {
                setEvent(result);
            }
            await loadUploadHistory();
            setLoading(false);
        } catch (error) {
            console.error("Failed to load event:", error);
            addToast("Failed to load event details", "error");
            setLoading(false);
        }
    };

    const loadUploadHistory = async () => {
        try {
            // Using a mock fetch wrapper if API not explicit, assuming equivalent to previous code
            const response = await fetch(`${API_BASE}/events/${eventId}/uploads`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                const serverJobs = data.uploads || [];

                setUploadJobs(prev => {
                    // Keep virtual jobs that haven't been picked up by the server yet
                    // (Match by folder_name as a heuristic, or just clear if newer server jobs exist)
                    const virtualJobs = prev.filter(j =>
                        String(j.id).startsWith('virtual-') &&
                        !serverJobs.some(sj => sj.folder_name === j.folder_name)
                    );
                    return [...virtualJobs, ...serverJobs];
                });
            } else if (response.status === 401) {
                handleAuthExpired();
            }
        } catch (error) {
            setUploadJobs([]);
        }
    };

    const handleFileSelect = async (e, isFolder = false) => {
        const rawFiles = e.target.files;
        if (!rawFiles?.length) return;

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const validFiles = Array.from(rawFiles).filter(file => {
            const lowerName = file.name.toLowerCase();
            return allowedExtensions.some(ext => lowerName.endsWith(ext));
        });

        if (validFiles.length === 0) {
            addToast("No valid files selected. Allowed: .jpg, .jpeg, .png, .webp", "error");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const currentUser = user || { id: 1 };
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStats({ totalFiles: validFiles.length, uploadedFiles: 0 });

        try {
            const folderName = isFolder
                ? validFiles[0]?.webkitRelativePath?.split('/')[0] || `Folder Upload`
                : `Batch Upload ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-')}`;

            // Real-time: Add a "Virtual Job" to the history list immediately
            const virtualJob = {
                id: 'virtual-' + Date.now(),
                folder_name: folderName,
                photos_uploaded: 0,
                total_photos: validFiles.length,
                created_at: new Date().toISOString(),
                status: 'uploading'
            };
            setUploadJobs(prev => [virtualJob, ...prev]);

            const result = await photoAPI.uploadFolder(
                validFiles,
                folderName,
                eventId,
                currentUser.id,
                (percent) => {
                    setUploadProgress(percent);
                    const uploadedCount = Math.floor((percent / 100) * validFiles.length);
                    setUploadStats(prev => ({
                        ...prev,
                        uploadedFiles: uploadedCount
                    }));

                    // Update the virtual job in the list for real-time feel
                    setUploadJobs(prev => prev.map(job =>
                        job.id === virtualJob.id
                            ? { ...job, photos_uploaded: uploadedCount, progress: percent }
                            : job
                    ));
                }
            );

            if ((result?.failed ?? 0) > 0) {
                addToast(`Uploaded ${result.uploaded} photo(s). ${result.failed} failed.`, 'info');
            } else {
                addToast(result.message || `Uploaded ${result.uploaded} photo(s) successfully.`, 'success');
            }

            // Once request returns, the job might still be 'processing' on backend
            // loadUploadHistory will handle the update
            await loadUploadHistory();
            await loadEventData();

        } catch (error) {
            console.error('Upload error:', error);
            addToast(error.message || 'Upload failed', 'error');
            // Remove the virtual job if failed
            await loadUploadHistory();
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    const handleLogout = () => {
        clearStoredAuth();
        navigate('/photographer/login');
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '--';
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleMarkComplete = async () => {
        setIsMarkingComplete(true);
        try {
            const formData = new FormData();
            formData.append('status', 'completed');
            const response = await fetch(`${API_BASE}/events/${eventId}/status`, {
                method: 'PUT',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                addToast('Upload marked as complete', 'success');
                setShowCompleteModal(false);
                await loadEventData();
            } else if (response.status === 401) {
                handleAuthExpired();
            } else {
                addToast('Failed to mark upload as complete', 'error');
            }
        } catch (error) {
            console.error('Error marking complete:', error);
            addToast('Failed to mark upload as complete', 'error');
        } finally {
            setIsMarkingComplete(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                <AILoader active={true} text="SYNCING EVENT" />
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: '#F8FAFC', fontFamily: '"Inter", -apple-system, sans-serif', paddingTop: '70px', boxSizing: 'border-box', overflowY: 'auto' }}>
            <style>{`
                .photographer-event-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                .photographer-event-grid .upload-table th,
                .photographer-event-grid .upload-table td {
                    padding: 1rem 1.5rem;
                }
                @media (max-width: 768px) {
                    .photographer-event-grid {
                        grid-template-columns: 1fr;
                    }
                    .photographer-event-content {
                        padding: 1.5rem 1rem !important;
                    }
                    .photographer-event-header-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                    .photographer-event-meta {
                        flex-direction: column !important;
                        gap: 0.5rem !important;
                    }
                    .photographer-event-header-row h1 {
                        font-size: 1.5rem !important;
                    }
                    .photographer-event-grid .upload-table th,
                    .photographer-event-grid .upload-table td {
                        padding: 0.6rem 0.75rem;
                        font-size: 0.8rem;
                    }
                    .photographer-event-grid .upload-table .hide-mobile {
                        display: none;
                    }
                }
            `}</style>

            {/* Internal header removed — global navbar handles navigation */}

            <div className="photographer-event-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                {/* Header Section */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <Link to="/photographer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748B', textDecoration: 'none', marginBottom: '1rem', fontWeight: '500' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>

                    <div className="photographer-event-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '100px', background: '#EEF2FF', color: '#4F46E5', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                                ASSIGNMENT # {event?.event_id || event?.id}
                            </div>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#1E293B', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                                {event?.name}
                            </h1>
                            <div className="photographer-event-meta" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', color: '#64748B', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {event?.location || 'TBD'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={16} /> {new Date(event?.date).toLocaleDateString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16} /> {event?.event_time || 'All Day'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <StatItem icon={ImageIcon} value={event?.photo_count || 0} label="Total Photos" />

                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="photographer-event-grid">

                    {/* Left Column: Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#64748B', letterSpacing: '0.05em' }}>ACTIONS</h3>

                        {event?.photos_upload_complete === 1 && (
                            <StandardCard style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ minWidth: '24px', color: '#059669' }}><CheckCircle size={24} /></div>
                                    <div style={{ fontSize: '0.85rem', color: '#047857', lineHeight: 1.5 }}>
                                        <strong style={{ display: 'block', color: '#065f46', marginBottom: '0.25rem' }}>Upload Finalized</strong>
                                        This event's upload has been marked as complete. Upload and delete actions are now disabled.
                                    </div>
                                </div>
                            </StandardCard>
                        )}

                        <UploadActionCard
                            title="Upload Folder"
                            description={event?.photos_upload_complete === 1 ? "Upload disabled - marked complete" : "Bulk upload an entire directory structure at once."}
                            icon={FolderOpen}
                            color="blue"
                            onClick={() => folderInputRef.current?.click()}
                            disabled={isUploading || event?.photos_upload_complete === 1}
                        />

                        <UploadActionCard
                            title="Upload Photos"
                            description={event?.photos_upload_complete === 1 ? "Upload disabled - marked complete" : "Select generic image files (JPG, PNG) from your device."}
                            icon={ImageIcon}
                            color="indigo"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || event?.photos_upload_complete === 1}
                        />


                        <StandardCard style={{ marginTop: '1rem', background: '#F8FAFC', border: '1px dashed #E2E8F0' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ minWidth: '24px', color: '#64748B' }}><AlertCircle size={24} /></div>
                                <div style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                                    <strong style={{ display: 'block', color: '#334155', marginBottom: '0.25rem' }}>File Requirements</strong>
                                    Ensure all photos are high-resolution. RAW formats should be converted to JPEG/PNG for optimal processing speed.
                                </div>
                            </div>
                        </StandardCard>
                    </div>

                    {/* Right Column: History */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#64748B', letterSpacing: '0.05em' }}>UPLOAD HISTORY</h3>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#94A3B8' }}>{uploadJobs.length} Sessions</span>
                        </div>

                        <StandardCard style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="upload-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontWeight: '600', color: '#64748B', fontSize: '0.75rem', letterSpacing: '0.05em' }}>SOURCE</th>
                                            <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontWeight: '600', color: '#64748B', fontSize: '0.75rem', letterSpacing: '0.05em' }}>COUNT</th>
                                            <th className="hide-mobile" style={{ textAlign: 'left', padding: '1rem 1.5rem', fontWeight: '600', color: '#64748B', fontSize: '0.75rem', letterSpacing: '0.05em' }}>DATE</th>
                                            <th style={{ textAlign: 'center', padding: '1rem 1.5rem', fontWeight: '600', color: '#64748B', fontSize: '0.75rem', letterSpacing: '0.05em' }}>STATUS</th>
                                            <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontWeight: '600', color: '#64748B', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadJobs.length > 0 ? (
                                            uploadJobs.map((job, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                    <td style={{ padding: '1rem 1.5rem', color: '#1E293B', fontWeight: '500' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <FolderOpen size={16} color="#94A3B8" />
                                                            {job.folder_name || 'Manual Upload'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', color: '#475569' }}>
                                                        {job.photos_uploaded || job.total_photos || 0}
                                                    </td>
                                                    <td className="hide-mobile" style={{ padding: '1rem 1.5rem', color: '#94A3B8' }}>
                                                        {formatTime(job.created_at)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                        {(() => {
                                                            const status = job.status?.toLowerCase() || '';
                                                            const isDone = status === 'completed' || status === 'success' || status === 'done';
                                                            const isFailed = status === 'failed' || status === 'error';
                                                            const isUploading = status === 'uploading';

                                                            return (
                                                                <span style={{
                                                                    display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '100px',
                                                                    fontSize: '0.75rem', fontWeight: '700',
                                                                    background: isDone ? '#ECFDF5' : isFailed ? '#FEF2F2' : isUploading ? '#EEF2FF' : '#FFFBEB',
                                                                    color: isDone ? '#059669' : isFailed ? '#DC2626' : isUploading ? '#4F46E5' : '#B45309',
                                                                    border: `1px solid ${isDone ? '#D1FAE5' : isFailed ? '#FCA5A5' : isUploading ? '#C7D2FE' : '#FDE68A'}`
                                                                }}>
                                                                    {isDone ? 'DONE' : isFailed ? 'FAILED' : isUploading ? 'UPLOADING...' : 'PROCESSING'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => handleViewFolder(job.folder_name)}
                                                                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="View Photos"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {event?.photos_upload_complete !== 1 && !job.id?.toString().startsWith('virtual-') && (
                                                                <button
                                                                    onClick={() => { setFolderToDelete(job.folder_name); setShowDeleteModal(true); }}
                                                                    style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #FEE2E2', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                    title="Delete Folder"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                                                    No uploads recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Upload Complete Button Area */}
                            {event?.photos_upload_complete !== 1 && (
                                <div style={{ padding: '1rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                                    <button
                                        onClick={() => setShowCompleteModal(true)}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1.5rem',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2), 0 2px 4px -1px rgba(5, 150, 105, 0.1)',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(5, 150, 105, 0.3), 0 4px 6px -2px rgba(5, 150, 105, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(5, 150, 105, 0.2), 0 2px 4px -1px rgba(5, 150, 105, 0.1)';
                                        }}
                                    >
                                        <CheckCircle size={18} />
                                        Mark Upload as Complete
                                    </button>
                                </div>
                            )}
                        </StandardCard>
                    </div>
                </div>
            </div>

            {/* Upload Progress Modal */}
            <AnimatePresence>
                {isUploading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed', bottom: '2rem', right: '2rem', width: '380px',
                            background: 'white', borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            border: '1px solid #E2E8F0', padding: '1.5rem', zIndex: 100
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: '#EEF2FF', color: '#4F46E5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {uploadProgress < 100 ? <Upload size={18} /> : <Cpu size={18} className="animate-pulse" />}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.95rem' }}>
                                        {uploadProgress < 100 ? 'Transferring Media...' : 'AI Processing...'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                        {uploadProgress < 100 ? 'Securely moving files' : 'Generating FaceNet Embeddings'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#4F46E5' }}>{uploadProgress}%</div>
                        </div>

                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                            <motion.div animate={{ width: `${uploadProgress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #4F46E5, #6366F1)', borderRadius: '4px' }} />
                        </div>

                        <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#64748B', fontWeight: '500' }}>Progress</span>
                                <span style={{ color: '#1E293B', fontWeight: '700' }}>{uploadStats.uploadedFiles} / {uploadStats.totalFiles}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                Status: <span style={{ color: '#059669', fontWeight: '600' }}>{uploadProgress < 100 ? 'Uploading' : 'Live Syncing'}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Complete Confirmation Modal */}
            <AnimatePresence>
                {showCompleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 200,
                            padding: '1rem'
                        }}
                        onClick={() => !isMarkingComplete && setShowCompleteModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                maxWidth: '500px',
                                width: '100%',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                padding: '1.5rem',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: '#FEF2F2',
                                        color: '#DC2626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <AlertTriangle size={22} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>
                                        Finalize Upload?
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    disabled={isMarkingComplete}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        cursor: 'pointer',
                                        padding: '0.25rem'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                <div style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    marginBottom: '1.25rem'
                                }}>
                                    <p style={{
                                        fontSize: '0.9rem',
                                        color: '#991B1B',
                                        lineHeight: 1.6,
                                        margin: 0
                                    }}>
                                        <strong>Warning:</strong> Once you mark this upload as complete, you will <strong>no longer be able to upload or delete photos</strong> for this event. This action cannot be undone.
                                    </p>
                                </div>

                                <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                    Are you sure you want to finalize the upload for <strong style={{ color: '#1E293B' }}>{event?.name}</strong>? Please confirm that all photos have been uploaded successfully.
                                </p>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowCompleteModal(false)}
                                        disabled={isMarkingComplete}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            background: 'white',
                                            border: '1px solid #E2E8F0',
                                            color: '#64748B',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: isMarkingComplete ? 'not-allowed' : 'pointer',
                                            opacity: isMarkingComplete ? 0.5 : 1
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleMarkComplete}
                                        disabled={isMarkingComplete}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            background: isMarkingComplete ? '#94A3B8' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: isMarkingComplete ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {isMarkingComplete ? 'Processing...' : (
                                            <>
                                                <CheckCircle size={18} />
                                                Yes, Finalize Upload
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Folder Photos Modal */}
            <AnimatePresence>
                {showViewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', zIndex: 300, padding: '2rem'
                        }}
                        onClick={() => setShowViewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white', borderRadius: '24px', width: '100%',
                                maxWidth: '1000px', maxHeight: '85vh', display: 'flex',
                                flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{selectedFolder}</h3>
                                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>{folderPhotos.length} Photos in this batch</div>
                                </div>
                                <button onClick={() => setShowViewModal(false)} style={{ background: '#F1F5F9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                                {loadingPhotos ? (
                                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AILoader active={true} text="FETCHING PHOTOS" />
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                                        {folderPhotos.map((photo, i) => (
                                            <motion.div
                                                key={photo.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', background: '#F8FAFC', border: '1px solid #F1F5F9' }}
                                            >
                                                <img
                                                    src={getPhotoUrl(photo.file_path, true)}
                                                    alt={photo.original_filename}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Error+Loading+Photo'}
                                                />
                                            </motion.div>
                                        ))}
                                        {folderPhotos.length === 0 && (
                                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>
                                                <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                                <p>No photos found in this folder.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Folder Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}
                        onClick={() => !isDeleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'white', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}
                        >
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={24} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>Delete Folder?</h3>
                            </div>
                            <div style={{ padding: '1.5rem' }}>
                                <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                                    Are you sure you want to delete <strong style={{ color: '#1E293B' }}>{folderToDelete}</strong>?
                                    This will permanently remove all photos in this folder from the event and the server.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: 'white', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.9rem', fontWeight: '600', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteFolder}
                                        disabled={isDeleting}
                                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: isDeleting ? '#94A3B8' : '#DC2626', border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        {isDeleting ? 'Deleting...' : (
                                            <>
                                                <Trash2 size={18} /> Delete Folder
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inputs */}
            <input type="file" ref={fileInputRef} multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, false)} />
            <input type="file" ref={folderInputRef} webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, true)} />
        </div>
    );
};

export default PhotographerEventPage;
