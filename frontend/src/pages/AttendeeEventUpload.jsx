import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Upload, CheckCircle, ArrowRight, Camera, ArrowLeft } from 'lucide-react';
import { eventAPI, attendeeAPI, API_BASE } from '../services/api';
import { useToast } from '../context/ToastContext';

const AttendeeEventUpload = () => {
    const { attendeeId, eventId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const response = await eventAPI.getById(eventId);
                if (response.status === 'success') {
                    setEvent(response.event);
                } else {
                    addToast("Failed to load event details.", "error");
                }
            } catch (err) {
                console.error("Error fetching event details:", err);
                addToast("Failed to connect to the server.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchEventDetails();
        }
    }, [eventId, addToast]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleUploadSubmit = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        setUploadSuccess(false);

        try {
            const result = await attendeeAPI.uploadPhotos(attendeeId, eventId, selectedFiles, (percent) => {
                setUploadProgress(percent);
            });

            const uploadedCount = result?.uploaded ?? 0;
            const failedCount = result?.failed ?? 0;

            if (failedCount > 0) {
                addToast(`Uploaded ${uploadedCount} photo(s). ${failedCount} failed.`, "info");
            } else {
                addToast(result.message || "Photos uploaded successfully!", "success");
            }

            setUploadSuccess(uploadedCount > 0);
            setSelectedFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error("Upload error:", error);
            addToast(error.message || "An error occurred during upload.", "error");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!event) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', color: '#64748B' }}>
                Event not found.
            </div>
        );
    }

    const apiUrl = API_BASE;

    return (
        <div style={{ minHeight: '100dvh', background: '#F8FAFC', fontFamily: '"Inter", sans-serif', position: 'relative' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate(`/attendee/access`)}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#64748B',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    zIndex: 50,
                    transition: 'color 0.2s',
                    fontSize: '0.95rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#1E293B'}
                onMouseOut={(e) => e.currentTarget.style.color = '#64748B'}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '100px 20px 40px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '2.5rem',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)',
                        textAlign: 'center'
                    }}
                >
                    {/* Event Banner */}
                    {event.banner_path ? (
                        <div style={{
                            margin: '-2.5rem -2.5rem 1.5rem -2.5rem',
                            height: '200px',
                            background: `url('${apiUrl}${event.banner_path}') center/cover no-repeat`,
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent)',
                                borderTopLeftRadius: '24px',
                                borderTopRightRadius: '24px'
                            }} />

                            <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem', right: '2.5rem', textAlign: 'left' }}>
                                <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'white', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                    {event.name}
                                </h1>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                width: '64px', height: '64px', margin: '0 auto 1.5rem',
                                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                color: '#059669', borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Camera size={32} />
                            </div>

                            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0F172A', marginBottom: '1.5rem' }}>
                                {event.name}
                            </h1>
                        </>
                    )}

                    {/* Event Details Box */}
                    <div style={{
                        background: '#F8FAFC',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        textAlign: 'left'
                    }}>
                        {event.date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                                <Calendar size={18} style={{ color: '#059669' }} />
                                <span style={{ fontWeight: '500' }}>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        )}
                        {event.time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                                <Clock size={18} style={{ color: '#059669' }} />
                                <span style={{ fontWeight: '500' }}>{event.time}</span>
                            </div>
                        )}
                        {event.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                                <MapPin size={18} style={{ color: '#059669' }} />
                                <span style={{ fontWeight: '500' }}>{event.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Upload Section or Gallery Navigation based on Event Status */}
                    {event.status === 'active' ? (
                        uploadSuccess ? (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <div style={{
                                    background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1.5rem',
                                    borderRadius: '16px', marginBottom: '2rem', color: '#064E3B'
                                }}>
                                    <CheckCircle size={32} style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Upload Complete!</h3>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Thank you for sharing your moments.</p>
                                </div>

                                <button
                                    onClick={() => {
                                        setUploadSuccess(false);
                                        setSelectedFiles([]);
                                    }}
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '14px', border: 'none',
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white',
                                        fontWeight: '600', fontSize: '1rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <Upload size={18} /> Upload More Photos
                                </button>
                            </motion.div>
                        ) : (
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    multiple
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />

                                {selectedFiles.length === 0 ? (
                                    <button
                                        onClick={handleUploadClick}
                                        style={{
                                            width: '100%', padding: '1.25rem', borderRadius: '16px',
                                            border: '2px dashed #CBD5E1', background: '#F8FAFC',
                                            color: '#475569', fontSize: '1rem', fontWeight: '600',
                                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s',
                                            marginBottom: '1.5rem'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#ECFDF5'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                                    >
                                        <Upload size={24} style={{ color: '#10B981' }} />
                                        <span>Select Photos to Upload</span>
                                    </button>
                                ) : (
                                    <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <p style={{ fontWeight: '600', color: '#1E293B', margin: 0 }}>
                                                {selectedFiles.length} photo(s) selected
                                            </p>
                                        </div>

                                        {/* Image Previews */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                            gap: '0.75rem',
                                            marginBottom: '1.5rem',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            paddingRight: '0.5rem'
                                        }}>
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} style={{
                                                    aspectRatio: '1/1',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    border: '1px solid #E2E8F0'
                                                }}>
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Preview ${index}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {uploading && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#10B981', transition: 'width 0.3s' }} />
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', textAlign: 'right' }}>
                                                    {uploadProgress}%
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                onClick={() => setSelectedFiles([])}
                                                disabled={uploading}
                                                style={{
                                                    flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0',
                                                    background: 'white', color: '#64748B', fontWeight: '500', cursor: uploading ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleUploadSubmit}
                                                disabled={uploading}
                                                style={{
                                                    flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none',
                                                    background: '#10B981', color: 'white', fontWeight: '600',
                                                    cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                                }}
                                            >
                                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {event.status === 'completed' && (
                                    <div>
                                        <button
                                            onClick={() => navigate(`/attendee/access`)}
                                            style={{
                                                width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                color: '#475569',
                                                fontWeight: '600', fontSize: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                                        >
                                            Skip & Go to Gallery <ArrowRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div>
                            <div style={{
                                padding: '1.5rem', background: '#F8FAFC', borderRadius: '16px',
                                border: '1px solid #E2E8F0', marginBottom: '1.5rem', color: '#64748B'
                            }}>
                                {event.status === 'pre-event'
                                    ? "Photo uploads will be available once the event starts."
                                    : event.status === 'processing'
                                        ? "Photo uploads for this event are closed while we process the gallery."
                                        : "Photo uploads for this event have been closed."}
                            </div>

                            {event.status === 'completed' && (
                                <button
                                    onClick={() => navigate(`/attendee/access`)}
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '14px', border: 'none',
                                        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                                        color: 'white',
                                        fontWeight: '600', fontSize: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    Continue to Gallery <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default AttendeeEventUpload;
