import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, MapPin, Mail, Phone, Camera, CheckCircle,
    Download, QrCode, Shield, ArrowLeft, Settings,
    Share2, X, CreditCard, Smartphone, Zap, Globe
} from 'lucide-react';
import QRCode from 'qrcode';
import { Link, useNavigate } from 'react-router-dom';
import '../landing.css';
import { getEventCover } from '../utils/eventConstants';
import { authAPI, eventAPI, organizerAPI, API_BASE, isUnauthorizedError } from '../services/api.js';
import { useToast } from '../context/ToastContext';
import PaymentView from '../components/PaymentView';

// --- Shared Components (Mature SaaS) ---

const StandardCard = ({ children, style = {} }) => (
    <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        ...style
    }}>
        {children}
    </div>
);

const BackgroundDecoration = () => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
            position: 'absolute', width: '100%', height: '100%',
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px', opacity: 0.4
        }} />
        <div style={{
            position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '120%', height: '600px',
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 100%)',
            zIndex: 0
        }} />
        <div style={{
            position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', height: '800px',
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 100%)',
            zIndex: 0
        }} />
    </div>
);

function EventRegistration() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState(0);
    const [photographers, setPhotographers] = useState([]);
    const [formData, setFormData] = useState({
        eventName: '',
        eventDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        })(),
        eventTime: '18:00',
        eventType: 'wedding',
        facility: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        dataRetention: '3',
        photographerId: '',
        photographerIds: [],
        requireConsent: true,
        eventSize: '1-300'
    });

    const [submitted, setSubmitted] = useState(false);
    const [eventId, setEventId] = useState(null);
    const [eventDbId, setEventDbId] = useState(null); // Integer ID for API calls
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [isSendingInvites, setIsSendingInvites] = useState(false);
    const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [bannerUrl, setBannerUrl] = useState(null);

    useEffect(() => {
        const fetchPhotographers = async () => {
            try {
                const { organizerAPI } = await import('../services/api.js');
                const result = await organizerAPI.getPhotographers();
                if (result?.status === 'success') {
                    setPhotographers(result.photographers || []);
                }
            } catch (err) {
                console.error('Failed to fetch photographers:', err);
            }
        };
        fetchPhotographers();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const generateQRCode = async (eventId) => {
        try {
            const registrationUrl = `${window.location.origin}/attendee/access?eventId=${eventId}`;
            const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'H'
            });
            setQrCodeUrl(qrDataUrl);
        } catch (err) {
            console.error('QR Code generation error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeTab < 2) {
            setActiveTab(activeTab + 1);
            return;
        }
        setShowPayment(true);
    };

    const handlePaymentSuccess = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const { eventAPI } = await import('../services/api.js');
            const result = await eventAPI.create({
                name: formData.eventName,
                date: formData.eventDate,
                time: formData.eventTime,
                type: formData.eventType,
                facility: formData.facility,
                owner_name: formData.ownerName,
                owner_email: formData.ownerEmail,
                owner_phone: formData.ownerPhone,
                data_retention: formData.dataRetention,
                eventSize: formData.eventSize,
                photographer_id: formData.photographerIds[0] || '',
                photographer_ids: JSON.stringify(formData.photographerIds)
            });

            const newEventId = result?.id || result?.event_id || 'EVT-' + Date.now().toString(36).toUpperCase();
            const displayUuid = result?.event_uuid;
            setEventId(newEventId);

            if (result?.id && typeof result.id === 'number') {
                setEventDbId(result.id);
            } else if (!isNaN(parseInt(result?.id))) {
                setEventDbId(parseInt(result.id));
            }

            // Save consent setting keyed by numeric ID
            localStorage.setItem(`requireConsent_${newEventId}`, formData.requireConsent);

            if (result?.qr_code_path) {
                setQrCodeUrl(`${API_BASE}${result.qr_code_path}`);
            } else {
                await generateQRCode(newEventId);
            }

            if (result?.banner_path) {
                setBannerUrl(`${API_BASE}${result.banner_path}`);
            }

            addToast('Payment successful! Event created.', 'success');
            setShowPayment(false);
            setSubmitted(true);
        } catch (err) {
            console.error('Event creation error:', err);
            if (isUnauthorizedError(err)) {
                addToast('Your session expired. Please log in again.', 'error');
                setShowPayment(false);
                navigate(`/organizer/login?redirect=${encodeURIComponent('/event-registration')}`);
                return;
            }
            addToast(err.message || 'Failed to create event. Starting in offline mode.', 'error');
            const newEventId = 'EVT-' + Date.now().toString(36).toUpperCase();
            setEventId(newEventId);
            localStorage.setItem(`requireConsent_${newEventId}`, formData.requireConsent);
            await generateQRCode(newEventId);
            setShowPayment(false);
            setSubmitted(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: formData.eventName,
            text: `Join our event: ${formData.eventName}`,
            url: `${window.location.origin}/attendee/access?eventId=${eventId}`
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                addToast('Link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Sharing failed', err);
        }
    };

    const cardRef = React.useRef(null);
    const posterRef = React.useRef(null);
    const hiddenPosterRef = React.useRef(null);

    const downloadQRCode = async () => {
        if (hiddenPosterRef.current) {
            try {
                const dataUrl = await import('html-to-image').then(mod => mod.toPng(hiddenPosterRef.current, {
                    cacheBust: true,
                    pixelRatio: 1, // High resolution inherently because container is 1080x1920
                    filter: (node) => {
                        const isIgnored = node.getAttribute?.('data-html2canvas-ignore') === 'true';
                        return !isIgnored;
                    }
                }));
                const link = document.createElement('a');
                link.download = `event-poster-${eventId}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Poster generation failed', err);
                if (qrCodeUrl) {
                    const link = document.createElement('a');
                    link.download = `event-qr-${eventId}.png`;
                    link.href = qrCodeUrl;
                    link.click();
                }
            }
        }
    };

    // --- Success UI ---
    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', position: 'relative', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>
                <style>
                    {`
                        @media (max-width: 960px) {
                            .success-flex { flex-direction: column !important; }
                            .success-col { 
                                min-width: 0 !important; 
                                width: 100% !important; 
                                border: none !important; 
                                padding: 2rem 1rem !important;
                                align-items: center !important;
                                text-align: center !important;
                            }
                            .banner-window { max-width: 90% !important; height: auto !important; aspect-ratio: 4/3 !important; }
                            .qr-container { padding: 1.5rem !important; width: 100% !important; max-width: 300px !important; }
                            .success-title { font-size: 1.5rem !important; }
                        }
                    `}
                </style>
                <BackgroundDecoration />
                <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.5rem', paddingTop: '8rem' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '1080px' }}>
                        <StandardCard style={{ display: 'flex', flexDirection: 'row', minHeight: '650px', overflow: 'hidden' }}>
                            <div ref={posterRef} className="success-flex" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', width: '100%', background: 'white' }}>
                                {/* Left Side: Floating Banner Window & Name */}
                                <div className="success-col" style={{ flex: '1.2', minWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'white' }}>
                                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', background: '#ECFDF5', padding: '0.5rem 1rem', borderRadius: '100px', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <CheckCircle size={16} /> Event Created
                                    </div>
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                        className="banner-window"
                                        style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            height: '320px',
                                            borderRadius: '24px',
                                            overflow: 'hidden',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 8px 10px -5px rgba(0, 0, 0, 0.08)',
                                            border: '1px solid white',
                                            background: 'white',
                                            position: 'relative'
                                        }}
                                    >
                                        {bannerUrl ? (
                                            <img src={bannerUrl} alt="Event Banner" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', background: '#ECFDF5' }}>
                                                <CheckCircle size={80} />
                                            </div>
                                        )}
                                        {/* Premium Overlay Gloss */}
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
                                    </motion.div>

                                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                        <h3 className="success-title" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', margin: '0 0 0.5rem 0' }}>
                                            {formData.eventName}
                                        </h3>
                                        {(formData.eventDate || formData.eventTime) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '1rem', justifyContent: 'center' }}>
                                                <Calendar size={18} />
                                                <span>
                                                    {formData.eventDate && new Date(formData.eventDate).toLocaleDateString()}
                                                    {formData.eventDate && formData.eventTime && ' • '}
                                                    {formData.eventTime}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: QR & Actions */}
                                <div className="success-col" style={{ flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column', background: 'white' }}>
                                    <div style={{ padding: '3rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div className="qr-container" style={{ background: '#F8FAFC', padding: '2.5rem', borderRadius: '32px', border: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                            {qrCodeUrl && (
                                                <img src={qrCodeUrl} alt="QR" style={{ width: '220px', height: '220px', borderRadius: '16px', background: 'white', padding: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }} />
                                            )}
                                            <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '700', color: '#1E293B', letterSpacing: '0.1em' }}>
                                                ID: {eventId}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 3rem 3rem' }} data-html2canvas-ignore="true">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <button onClick={() => setShowInviteModal(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
                                                    <Mail size={20} /> Invite Guests
                                                </button>
                                                <button onClick={handleShare} style={{ background: 'white', color: '#1E293B', border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                                                    <Share2 size={18} /> Share Event Access
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                                <button onClick={downloadQRCode} style={{ background: 'white', color: '#1E293B', border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                                                    <Download size={18} /> Download Poster
                                                </button>
                                            </div>

                                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                                <Link to="/organizer/dashboard" style={{ color: '#6366F1', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem' }}>
                                                    Go to Dashboard
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StandardCard>
                    </motion.div>
                </div>

                <AnimatePresence>
                    {showInviteModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '100%', maxWidth: '480px' }}>
                                <StandardCard style={{ padding: '2.5rem', position: 'relative' }}>
                                    <button onClick={() => setShowInviteModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                        <X size={24} />
                                    </button>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>Invite Guests</h3>
                                    <p style={{ color: '#64748B', marginBottom: '2rem' }}>Send registration links directly to emails.</p>

                                    <textarea
                                        style={{ width: '100%', height: '120px', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', marginBottom: '1.5rem', outline: 'none', fontSize: '0.9rem' }}
                                        placeholder="Comma separated emails..."
                                        value={inviteEmails}
                                        onChange={(e) => setInviteEmails(e.target.value)}
                                    />

                                    <button
                                        disabled={isSendingInvites || !inviteEmails.trim()}
                                        onClick={async () => {
                                            if (!eventDbId) {
                                                addToast('Cannot send invites: API Event ID missing', 'error');
                                                return;
                                            }
                                            setIsSendingInvites(true);
                                            try {
                                                await authAPI.sendInvitations(inviteEmails, eventDbId);
                                                setShowInviteModal(false);
                                                setInviteEmails('');
                                                setShowInviteSuccessModal(true);
                                            }
                                            catch (err) {
                                                console.error(err);
                                                addToast(err.message || 'Failed to send invitations', 'error');
                                            } finally {
                                                setIsSendingInvites(false);
                                            }
                                        }}
                                        style={{ width: '100%', background: '#4F46E5', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        {isSendingInvites ? "Sending..." : "Send Invitations"}
                                    </button>
                                </StandardCard>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showInviteSuccessModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '100%', maxWidth: '400px' }}>
                                <StandardCard style={{ padding: '2.5rem', position: 'relative', textAlign: 'center' }}>
                                    <button onClick={() => setShowInviteSuccessModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                        <X size={24} />
                                    </button>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>Success</h3>
                                    <p style={{ color: '#64748B', marginBottom: '2rem' }}>Emails have been sent. They will now be able to register to the event</p>
                                    <button
                                        onClick={() => setShowInviteSuccessModal(false)}
                                        style={{ width: '100%', background: '#4F46E5', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                </StandardCard>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HIDDEN 1080x1920 POSTER CONTAINER FOR HIGH-RES EXPORT */}
                <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
                    <div ref={hiddenPosterRef} style={{ width: '1080px', height: '1920px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>

                        {/* 1. Header Banner */}
                        <div style={{ width: '100%', height: '700px', backgroundColor: '#F8FAFC', position: 'relative' }}>
                            {bannerUrl ? (
                                <img src={bannerUrl} alt="Event Banner" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Camera size={120} opacity={0.5} />
                                </div>
                            )}
                            {/* Gradient Overlay for Text Readability if we wanted text over image, but we put it below */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))' }} />
                        </div>

                        {/* 2. Event Name, Date, Time (Main Content) */}
                        <div style={{ flex: 1, padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <h1 style={{ fontSize: '72px', fontWeight: '800', color: '#0F172A', margin: '0 0 20px 0', lineHeight: '1.1' }}>
                                {formData.eventName}
                            </h1>
                            {(formData.eventDate || formData.eventTime) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#475569', fontSize: '36px', fontWeight: '600', marginBottom: '80px' }}>
                                    <Calendar size={48} color="#6366F1" />
                                    <span>
                                        {formData.eventDate && new Date(formData.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {formData.eventDate && formData.eventTime && ' • '}
                                        {formData.eventTime && new Date(`1970-01-01T${formData.eventTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}

                            {/* 3. QR Code */}
                            {qrCodeUrl && (
                                <div style={{ background: '#F8FAFC', padding: '60px', borderRadius: '48px', border: '2px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
                                    <img src={qrCodeUrl} alt="QR Code" style={{ width: '400px', height: '400px', borderRadius: '32px', background: 'white', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} />
                                    <div style={{ fontSize: '32px', color: '#64748B', fontWeight: '500' }}>Scan to Experience</div>
                                </div>
                            )}

                            {/* 4. Registration Link (Footer) */}
                            <div style={{ marginTop: 'auto', marginBottom: '40px', paddingTop: '40px', borderTop: '2px solid #E2E8F0', width: '100%' }}>
                                <p style={{ fontSize: '24px', color: '#64748B', fontWeight: '500', margin: '0 0 10px 0' }}>Join us at:</p>
                                <p style={{ fontSize: '32px', color: '#4F46E5', fontWeight: '700', margin: 0 }}>
                                    {window.location.origin}/attendee/access?eventId={eventId}
                                </p>
                            </div>
                        </div>

                        {/* Top Accent Line */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16px', background: 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)' }} />
                    </div>
                </div>

            </div>
        );
    }

    const tabs = ["Basic Info", "Configuration", "Additional Details"];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#1E293B', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif', position: 'relative', overflow: 'hidden' }}>
            <BackgroundDecoration />

            <header style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2E8F0', backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(16px)', position: 'relative', zIndex: 10 }}>
                <Link to="/organizer/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
                    <ArrowLeft size={18} /> <span>Back to Events</span>
                </Link>
            </header>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '3rem 1rem', position: 'relative', zIndex: 1 }}>
                {showPayment ? (
                    <PaymentView
                        onBack={() => setShowPayment(false)}
                        onSuccess={handlePaymentSuccess}
                        formData={formData}
                    />
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '720px' }}>
                        <StandardCard>
                            <div style={{ padding: '2.5rem 2.5rem 0' }}>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', margin: '0 0 0.5rem 0' }}>New Event</h1>
                                <p style={{ color: '#64748B', margin: 0 }}>Configure the details for your upcoming event.</p>
                            </div>

                            <div style={{ display: 'flex', gap: '2rem', padding: '0 2.5rem', marginTop: '2rem', borderBottom: '1px solid #F1F5F9' }}>
                                {tabs.map((tab, idx) => (
                                    <button key={idx} onClick={() => setActiveTab(idx)} style={{ padding: '1rem 0', background: 'none', border: 'none', borderBottom: activeTab === idx ? '2px solid #6366F1' : '2px solid transparent', color: activeTab === idx ? '#4F46E5' : '#64748B', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div style={{ padding: '2.5rem' }}>
                                <form onSubmit={handleSubmit}>
                                    <AnimatePresence mode="wait">
                                        <motion.div key={activeTab} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.2 }}>
                                            {activeTab === 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Event Name</label>
                                                        <input type="text" name="eventName" placeholder="Summer Gala 2024" value={formData.eventName} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.95rem', background: '#F8FAFC', outline: 'none' }} />
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Date</label>
                                                            <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Time</label>
                                                            <input type="time" name="eventTime" value={formData.eventTime} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Venue / Location</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                                            <input type="text" name="facility" placeholder="Grand Ballroom" value={formData.facility} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Occasion Type</label>
                                                        <select name="eventType" value={formData.eventType} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                                            <option value="wedding">Wedding</option>
                                                            <option value="birthday">Birthday</option>
                                                            <option value="corporate">Corporate</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 1 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                                    {/* Dummy Consent Toggle Feature */}
                                                    <div style={{ padding: '1.25rem', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: '#1E293B' }}>Require Attendee Consent</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>Prompt attendees to consent to facial recognition and identity processing during registration.</div>
                                                        </div>
                                                        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                                                            <input type="checkbox" name="requireConsent" checked={formData.requireConsent !== false} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.requireConsent !== false ? '#10B981' : '#CBD5E1', transition: '.4s', borderRadius: '24px' }}></span>
                                                            <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: formData.requireConsent !== false ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></span>
                                                        </label>
                                                    </div>

                                                    {/* Data Retention Policy */}
                                                    <div style={{ padding: '1.25rem', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: '#1E293B' }}>Data Retention Policy</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>Duration to keep event data alive before automatic secure deletion.</div>
                                                        </div>
                                                        <select name="dataRetention" value={formData.dataRetention} onChange={handleChange} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none', background: '#F8FAFC', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                                                            <option value="3">3 Days</option>
                                                            <option value="5">5 Days</option>
                                                            <option value="7">7 Days</option>
                                                            <option value="11">11 Days</option>
                                                        </select>
                                                    </div>

                                                    {/* Event Size */}
                                                    <div style={{ padding: '1.25rem', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: '#1E293B' }}>Size of the event</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>Expected number of attendees.</div>
                                                        </div>
                                                        <select name="eventSize" value={formData.eventSize} onChange={handleChange} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none', background: '#F8FAFC', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                                                            <option value="1-300">1-300</option>
                                                            <option value="300-800">300-800</option>
                                                            <option value="800+">800+</option>
                                                        </select>
                                                    </div>

                                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Photographers (Optional)</label>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                        gap: '0.75rem',
                                                        maxHeight: '300px',
                                                        overflowY: 'auto',
                                                        padding: '0.5rem',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        background: 'white'
                                                    }}>
                                                        {photographers.map(p => (
                                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', backgroundColor: formData.photographerIds.includes(p.id) ? '#EEF2FF' : 'transparent' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    id={`photographer-${p.id}`}
                                                                    checked={formData.photographerIds.includes(p.id)}
                                                                    onChange={(e) => {
                                                                        const isChecked = e.target.checked;
                                                                        setFormData(prev => {
                                                                            const currentIds = prev.photographerIds || [];
                                                                            let newIds;
                                                                            if (isChecked) {
                                                                                newIds = [...currentIds, p.id];
                                                                            } else {
                                                                                newIds = currentIds.filter(id => id !== p.id);
                                                                            }
                                                                            return { ...prev, photographerIds: newIds };
                                                                        });
                                                                    }}
                                                                    style={{ width: '16px', height: '16px', accentColor: '#4F46E5', cursor: 'pointer' }}
                                                                />
                                                                <label htmlFor={`photographer-${p.id}`} style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer', flex: 1 }}>
                                                                    <div style={{ fontWeight: '500' }}>{p.name || p.full_name}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.organization || 'Freelance'}</div>
                                                                </label>
                                                            </div>
                                                        ))}
                                                        {photographers.length === 0 && (
                                                            <div style={{ padding: '1rem', gridColumn: '1/-1', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                                                                No photographers found.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 2 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div style={{ borderTop: 'none' }}>
                                                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '1.25rem' }}>Event Owner Details</h3>
                                                        <style>
                                                            {`
                                                                .contact-input::placeholder {
                                                                    color: #64748B;
                                                                    opacity: 1;
                                                                }
                                                            `}
                                                        </style>
                                                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                                                            <input className="form-input contact-input" placeholder="Event Owner Name" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#1E293B' }} name="ownerName" value={formData.ownerName} onChange={handleChange} />
                                                            <input className="form-input contact-input" placeholder="Event Owner Email Address" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#1E293B' }} name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>

                                    <div style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        marginTop: '3rem',
                                        paddingTop: '1.5rem',
                                        borderTop: '1px solid #F1F5F9',
                                        flexWrap: 'wrap',
                                        position: 'relative',
                                        zIndex: 10
                                    }}>
                                        {activeTab > 0 && (
                                            <button type="button" onClick={() => setActiveTab(activeTab - 1)} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '600', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', cursor: 'pointer', flex: '1 1 auto' }}>Back</button>
                                        )}
                                        <button
                                            type={activeTab === tabs.length - 1 ? "button" : "submit"}
                                            onClick={activeTab === tabs.length - 1 ? () => setShowPayment(true) : undefined}
                                            disabled={isSubmitting}
                                            style={{ flex: '2 1 200px', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                                        >
                                            {isSubmitting ? 'Creating...' : (activeTab === tabs.length - 1 ? 'Proceed to Payment' : 'Continue')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </StandardCard>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default EventRegistration;
