import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Mail, ArrowRight, Lock, CheckCircle, AlertCircle, QrCode, Download, Camera, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import '../landing.css';
import { getEventCover } from '../utils/eventConstants';
import { eventAPI, authAPI, API_BASE } from '../services/api';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';

// --- Shared Components (Mature SaaS) ---

const StandardCard = ({ children, style = {} }) => (
    <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        ...style
    }}>
        {children}
    </div>
);

const DetailBadge = ({ icon: Icon, text }) => (
    <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem', borderRadius: '100px',
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        color: '#64748B', fontSize: '0.9rem', fontWeight: '500'
    }}>
        <Icon size={16} />
        {text}
    </div>
);

function SingleEventLanding() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const location = useLocation();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authStep, setAuthStep] = useState('email'); // 'email' | 'otp'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [showAuth, setShowAuth] = useState(false);
    const [consents, setConsents] = useState({
        faceDistribution: false,
        selfieRegistration: false,
        photographyService: false
    });

    const apiUrl = API_BASE;

    // Generate QR code as fallback
    const generateQRCode = async (evtId) => {
        try {
            const registrationUrl = `${window.location.origin}/attendee/access?eventId=${evtId}`;
            const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
                width: 256, margin: 2, color: { dark: '#1E293B', light: '#ffffff' }
            });
            setQrCodeUrl(qrDataUrl);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    // Fetch Event Details
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const result = await eventAPI.getById(eventId);
                // Backend returns {status: 'success', event: {...}}
                const evt = result?.status === 'success' ? result.event : result;
                if (evt && evt.id) {
                    setEvent(evt);
                    if (evt.qr_code_path) {
                        setQrCodeUrl(`${apiUrl}${evt.qr_code_path}`);
                    } else {
                        await generateQRCode(eventId);
                    }
                } else {
                    setError('Event not found.');
                }
            } catch (err) {
                console.error("Failed to load event", err);
                setError('Unable to load event details.');
            } finally {
                setLoading(false);
            }
        };

        if (eventId) fetchEvent();
    }, [eventId]);

    // Handle email query parameter
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(emailParam);
            setShowAuth(true);
            addToast(`Welcome! Identity verification started for ${emailParam}`, 'info');
        }
    }, [location.search]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await authAPI.sendOtp(email, eventId);
            if (result.status === 'success') {
                addToast(`OTP sent to ${email}`, 'success');
                if (result.debug_otp) {
                    console.log("DEBUG OTP:", result.debug_otp);
                    addToast(`Dev OTP: ${result.debug_otp}`, 'info');
                }
                setAuthStep('otp');
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'Error sending OTP');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await authAPI.verifyOtp(email, otp, eventId);
            if (result.status === 'success') {
                addToast('Secure access verified', 'success');
                if (result.attendee_id) {
                    setTimeout(() => navigate(`/attendee/welcome/${result.attendee_id}`), 500);
                } else {
                    setTimeout(() => navigate(`/attendee-registration?eventId=${eventId}&email=${encodeURIComponent(email)}&verified=true`), 500);
                }
            } else {
                setError('Invalid OTP. Please check your code.');
                addToast("Invalid OTP", "error");
            }
        } catch (err) {
            setError('Verification failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}><AILoader active={true} text="LOADING EVENT" /></div>;

    if (error && !event) {
        return (
            <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
                <AlertCircle size={48} style={{ marginBottom: '1rem', color: '#EF4444' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E293B' }}>Event Unavailable</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', backgroundColor: '#F8FAFC', color: '#1E293B', fontFamily: '"Inter", -apple-system, sans-serif', position: 'relative', overflow: 'hidden' }}>

            {/* Background Decoration */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {/* Dot Pattern */}
                <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                    backgroundSize: '32px 32px', opacity: 0.4
                }} />

                {/* Ambient Gradients */}
                <div style={{
                    position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-5%', right: '-5%', width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
                    filter: 'blur(80px)', borderRadius: '50%'
                }} />
            </div>

            {/* Header / Brand */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1.5rem 2rem', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Camera size={18} />
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B' }}>EventLens</span>
                </div>
            </div>

            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', maxWidth: '1200px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center', width: '100%' }}>
                    {/* Left: Content */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                        <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#EFF6FF', color: '#2563EB', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
                            EVENT GALLERY ACCESS
                        </div>

                        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '800', lineHeight: 1.1, color: '#1E293B', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
                            {event?.name}
                        </h1>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                            <DetailBadge icon={Calendar} text={new Date(event?.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} />
                            <DetailBadge icon={Clock} text={event?.event_time || 'All Day'} />
                            <DetailBadge icon={MapPin} text={event?.location} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/attendee/access?eventId=${eventId}`)}
                                style={{
                                    padding: '1rem 3rem',
                                    borderRadius: '12px',
                                    background: '#1E293B',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    boxShadow: '0 4px 6px -1px rgba(30, 41, 59, 0.3)',
                                    width: '100%',
                                    maxWidth: '436px',
                                    justifyContent: 'center'
                                }}
                            >
                                <Mail size={20} />
                                Access my Gallery
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Right: Image */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
                        <StandardCard style={{ padding: '0.75rem', transform: 'rotate(-2deg)' }}>
                            <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                                <img
                                    src={event?.cover_image || getEventCover(event?.id)}
                                    onError={(e) => {
                                        e.target.onerror = null; // Prevent infinite loops
                                        e.target.src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80';
                                    }}
                                    alt={event?.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
                            </div>
                        </StandardCard>
                    </motion.div>

                </div>
            </div>

            {/* Auth Modal */}
            <AnimatePresence>
                {showAuth && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setShowAuth(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '2.5rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E293B' }}>Attendee Access</h3>
                                <button onClick={() => setShowAuth(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><AlertCircle size={24} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>

                            {authStep === 'email' ? (
                                <form onSubmit={handleSendOtp}>
                                    <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>Enter your email to verify your identity and access your personal gallery.</p>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="you@example.com"
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#1E293B', outline: 'none', background: '#F8FAFC' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                                        {[
                                            { id: 'faceDistribution', label: 'I consent to the use of facial recognition technology to identify me in event photographs and securely distribute my images.' },
                                            { id: 'selfieRegistration', label: 'I consent to the collection and processing of my selfie for identity verification and accurate photo matching.' },
                                            { id: 'photographyService', label: 'I consent to being photographed during the event, with the images processed and shared in accordance with the applicable privacy policy.' }
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setConsents(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    padding: '0.75rem 1rem', borderRadius: '12px',
                                                    border: consents[item.id] ? '1px solid #6366F1' : '1px solid #E2E8F0',
                                                    backgroundColor: consents[item.id] ? '#F5F7FF' : 'white',
                                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{
                                                    minWidth: '20px', width: '20px', height: '20px', borderRadius: '6px',
                                                    border: '2px solid', borderColor: consents[item.id] ? '#6366F1' : '#CBD5E1',
                                                    backgroundColor: consents[item.id] ? '#6366F1' : 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {consents[item.id] && <CheckCircle size={14} color="white" />}
                                                </div>
                                                <span style={{ fontWeight: '500', color: '#1E293B', fontSize: '0.85rem', lineHeight: 1.4 }}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !consents.faceDistribution || !consents.selfieRegistration || !consents.photographyService}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: '12px',
                                            background: (consents.faceDistribution && consents.selfieRegistration && consents.photographyService) ? '#4F46E5' : '#94A3B8',
                                            color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: (consents.faceDistribution && consents.selfieRegistration && consents.photographyService) ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Get Secure Code'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp}>
                                    <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>Enter the 6-digit code sent to <strong>{email}</strong></p>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Verification Code</label>
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            maxLength={6}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1.5rem', letterSpacing: '0.2em', textAlign: 'center', outline: 'none', background: '#F8FAFC' }}
                                        />
                                    </div>
                                    {error && <p style={{ color: '#EF4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
                                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', background: '#4F46E5', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
                                        {isSubmitting ? 'Verifying...' : 'Confirm Access'}
                                    </button>
                                    <button type="button" onClick={() => setAuthStep('email')} style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: '#64748B', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Change Email
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SingleEventLanding;
