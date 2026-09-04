import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, User, Mail, Shield, CheckCircle, ArrowRight, Aperture, ArrowLeft, Loader2, ShieldAlert, Glasses, Upload } from 'lucide-react';
import '../landing.css';
import { useToast } from '../context/ToastContext';
import { eventAPI } from '../services/api';

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

function AttendeeRegistration() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventIdParam = searchParams.get('eventId') || '';
    const storageKey = `attendee_registration_${eventIdParam || 'generic'}`;

    // Helper to initialize state from localStorage
    const getInitialState = () => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                return JSON.parse(savedState);
            }
        } catch (e) {
            console.error('Failed to load saved registration state', e);
        }
        return null;
    };

    const savedState = getInitialState();

    const urlEmail = searchParams.get('email') || '';
    const urlName = searchParams.get('name') || '';
    const verifiedFromAccess = searchParams.get('verified') === 'true' && !!urlEmail;
    const initialEmailVerified = verifiedFromAccess || Boolean(
        savedState?.isEmailVerified && (!urlEmail || savedState?.formData?.email === urlEmail)
    );

    const [formData, setFormData] = useState(() => {
        const initial = savedState?.formData || {
            eventId: eventIdParam,
            fullName: urlName,
            email: urlEmail,
            phone: '',
            faceDistribution: false,
            selfieRegistration: false,
            photographyService: false
        };
        // Always prioritize email from URL if present
        if (eventIdParam) initial.eventId = eventIdParam;
        if (urlEmail) initial.email = urlEmail;
        if (urlName) initial.fullName = urlName;
        return initial;
    });
    const selectedEventId = eventIdParam || formData.eventId || '';
    const [eventName, setEventName] = useState('Attendee Access');
    const [activeEvents, setActiveEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(!eventIdParam);
    const [requireConsent, setRequireConsent] = useState(true);

    const [step, setStep] = useState(savedState?.step || 1); // 1: Details, 2: Camera
    const [selfie, setSelfie] = useState(null);
    const [selfieFileName, setSelfieFileName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isEmailVerified] = useState(initialEmailVerified);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        try {
            const stateToSave = {
                formData,
                step,
                isEmailVerified,
                timestamp: new Date().getTime()
            };
            localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save registration state', e);
        }
    }, [formData, step, isEmailVerified, storageKey]);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const { addToast } = useToast();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const getAttendeeAccessPath = () => {
        const params = new URLSearchParams();
        if (selectedEventId) {
            params.set('eventId', selectedEventId);
        }
        if (formData.email) {
            params.set('email', formData.email);
        }
        const query = params.toString();
        return query ? `/attendee/access?${query}` : '/attendee/access';
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;
            setCameraActive(true);
            setVideoReady(false);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.log('Video play error:', e));
                }
            }, 100);
        } catch (err) {
            addToast('Unable to access camera. Please check permissions.', 'error');
            console.error('Camera error:', err);
        }
    };

    const handleVideoLoaded = () => {
        setVideoReady(true);
    };

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current && videoReady) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.setTransform(1, 0, 0, 1, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            setSelfie(imageData);
            stopCamera();
            addToast("Face scan captured successfully.", "info");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
        setVideoReady(false);
    };

    const retakeSelfie = () => {
        setSelfie(null);
        setSelfieFileName('');
        startCamera();
    };

    const handleUploadSelfie = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            addToast('Please upload a valid image file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelfie(reader.result);
            setSelfieFileName(file.name || 'uploaded-selfie.jpg');
            stopCamera();
            addToast('Photo uploaded successfully.', 'info');
        };
        reader.onerror = () => {
            addToast('Could not read this image. Try a different file.', 'error');
        };
        reader.readAsDataURL(file);
    };

    const handleNextStep = (e) => {
        e.preventDefault();

        if (!isEmailVerified) {
            addToast("Please verify your email and create your attendee password from attendee access first.", "error");
            return;
        }

        if (!formData.eventId || !formData.fullName || !formData.email || (requireConsent && (!formData.faceDistribution || !formData.selfieRegistration))) {
            addToast("Please fill in all required fields and provide consent.", "error");
            return;
        }
        setStep(2);
    };

    const handleBackStep = () => {
        stopCamera();
        setStep(1);
    };

    const handleSubmit = async () => {
        if (!selfie) {
            addToast('Please capture your biometric scan before submitting.', 'error');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(selfie);
            const blob = await response.blob();
            const { attendeeAPI } = await import('../services/api.js');
            const result = await attendeeAPI.register(formData, blob, selfieFileName || 'selfie.jpg');

            if (result.status === 'success' && result.id) {
                // Clear local storage upon success so the next registration is clean
                localStorage.removeItem(storageKey);

                addToast("Registration complete. Welcome!", "success");
                setTimeout(() => {
                    navigate(`/attendee/welcome/${result.id}`);
                }, 800);
            } else {
                throw new Error(result.message || 'Registration failed');
            }

        } catch (err) {
            console.error('Registration error:', err);
            setError('Registration failed. Please try again.');
            addToast("Registration failed. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const consentSetting = selectedEventId ? localStorage.getItem(`requireConsent_${selectedEventId}`) : null;
        setRequireConsent(consentSetting !== 'false');
    }, [selectedEventId]);

    useEffect(() => {
        if (eventIdParam) {
            setIsLoadingEvents(false);
            setActiveEvents([]);
            return;
        }

        let isMounted = true;

        const loadActiveEvents = async () => {
            setIsLoadingEvents(true);
            try {
                const response = await eventAPI.getAll();
                const events = Array.isArray(response) ? response : response?.events || [];
                const filteredEvents = events.filter((event) => String(event.status || '').toLowerCase() === 'active');

                if (!isMounted) {
                    return;
                }

                setActiveEvents(filteredEvents);
                setFormData((current) => {
                    const hasCurrentSelection = filteredEvents.some(
                        (event) => String(event.id) === String(current.eventId)
                    );

                    if (hasCurrentSelection) {
                        return current;
                    }

                    if (!filteredEvents.length) {
                        return {
                            ...current,
                            eventId: '',
                        };
                    }

                    return {
                        ...current,
                        eventId: String(filteredEvents[0].id),
                    };
                });
            } catch (err) {
                console.error("Failed to load active events:", err);
                if (isMounted) {
                    addToast('Unable to load active events right now.', 'error');
                }
            } finally {
                if (isMounted) {
                    setIsLoadingEvents(false);
                }
            }
        };

        loadActiveEvents();

        return () => {
            isMounted = false;
        };
    }, [addToast, eventIdParam]);

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!selectedEventId) {
                setEventName('Attendee Access');
                return;
            }

            try {
                const response = await eventAPI.getById(selectedEventId);
                if (response.status === 'success' && response.event) {
                    setEventName(response.event.name);
                }
            } catch (err) {
                console.error("Failed to fetch event details:", err);
                const selectedEvent = activeEvents.find((event) => String(event.id) === String(selectedEventId));
                setEventName(selectedEvent?.name || 'Attendee Access');
            }
        };

        fetchEventDetails();
    }, [activeEvents, selectedEventId]);

    useEffect(() => {
        if (searchParams.get('directScan') === 'true' && step === 1) {
            setFormData(prev => ({
                ...prev,
                faceDistribution: true,
                selfieRegistration: true,
                fullName: prev.email ? prev.email.split('@')[0] : 'Guest'
            }));
            setStep(2);
        }

        if (step === 2 && !selfie) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [step, searchParams]);

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif' }}>
                <StandardCard style={{ maxWidth: '480px', width: '90%', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: '#ECFDF5', color: '#059669', marginBottom: '1.5rem' }}>
                        <CheckCircle size={48} />
                    </div>

                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', marginBottom: '1rem' }}>
                        Registration Complete
                    </h2>

                    <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '2rem' }}>
                        You're all set! Our AI system is now processing your biometric profile. You will be able to access your photos shortly by logging in with OTP or password.
                    </p>

                    <div style={{ background: '#F1F5F9', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '2rem', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={16} /> Privacy Secured
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                            Your data is encrypted. You can log in securely using OTP or your attendee password once the event is live.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/attendee/access')}
                            style={{ width: '100%', background: '#4F46E5', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Go to Attendee Access
                        </button>
                    </div>
                </StandardCard>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', background: '#F8FAFC', position: 'relative', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>

            {/* Background Decoration */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }} />
                <div style={{
                    position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
                    filter: 'blur(60px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-5%', right: '-5%', width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
                    filter: 'blur(80px)', borderRadius: '50%'
                }} />
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 10, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', overflowY: 'auto' }}>

                {/* Return Button */}
                <div style={{ width: '100%', maxWidth: '500px', padding: '1rem 0 2rem 0', flexShrink: 0 }}>
                    <button
                        onClick={() => navigate(eventIdParam ? `/event/${eventIdParam}` : getAttendeeAccessPath())}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#64748B',
                            background: 'transparent',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            zIndex: 50,
                            transition: 'color 0.2s',
                            fontSize: '0.95rem',
                            padding: 0
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#1E293B'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#64748B'}
                    >
                        <ArrowLeft size={18} />
                        {eventIdParam ? 'Back to Event Details' : 'Back to Attendee Access'}
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: '500px', paddingBottom: '2rem' }}>
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                style={{ width: '100%', maxWidth: '480px' }}
                            >
                                <StandardCard style={{ padding: '2.5rem' }}>
                                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>
                                            {selectedEventId ? eventName : 'Choose Your Event'}
                                        </h1>
                                        <p style={{ color: '#64748B' }}>
                                            {selectedEventId
                                                ? `Complete your registration for ${eventName}.`
                                                : 'Pick any active event and complete your memory profile.'}
                                        </p>
                                    </div>

                                    <form onSubmit={handleNextStep}>
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
                                                {eventIdParam ? 'Event' : 'Active Event'}
                                            </label>
                                            {eventIdParam ? (
                                                <input
                                                    type="text"
                                                    value={eventName === 'Attendee Access' ? `Event #${eventIdParam}` : `${eventName} (ID ${eventIdParam})`}
                                                    readOnly
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #E2E8F0',
                                                        fontSize: '1rem',
                                                        outline: 'none',
                                                        background: '#F1F5F9',
                                                        cursor: 'not-allowed',
                                                        color: '#475569'
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    <select
                                                        name="eventId"
                                                        value={formData.eventId}
                                                        onChange={handleChange}
                                                        required
                                                        disabled={isLoadingEvents || !activeEvents.length}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid #E2E8F0',
                                                            fontSize: '1rem',
                                                            outline: 'none',
                                                            background: (isLoadingEvents || !activeEvents.length) ? '#F1F5F9' : '#F8FAFC',
                                                            cursor: (isLoadingEvents || !activeEvents.length) ? 'not-allowed' : 'pointer',
                                                            color: activeEvents.length ? '#1E293B' : '#94A3B8'
                                                        }}
                                                    >
                                                        <option value="">
                                                            {isLoadingEvents ? 'Loading active events...' : activeEvents.length ? 'Select an active event' : 'No active events available'}
                                                        </option>
                                                        {activeEvents.map((event) => (
                                                            <option key={event.id} value={String(event.id)}>
                                                                {event.name}{event.date ? ` - ${event.date}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {!isLoadingEvents && !activeEvents.length && (
                                                        <p style={{ margin: '0.6rem 0 0', color: '#B45309', fontSize: '0.85rem' }}>
                                                            No active events are open right now. Please try again later or use an event invite link.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Full Name</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    placeholder="Jane Doe"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    required
                                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '1rem', outline: 'none', background: '#F8FAFC' }}
                                                />
                                                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Email</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="jane@example.com"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    readOnly={isEmailVerified}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #E2E8F0',
                                                        fontSize: '1rem',
                                                        outline: 'none',
                                                        background: isEmailVerified ? '#F1F5F9' : '#F8FAFC',
                                                        color: isEmailVerified ? '#475569' : '#1E293B',
                                                        cursor: isEmailVerified ? 'not-allowed' : 'text',
                                                    }}
                                                />
                                                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                            </div>
                                            {isEmailVerified && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>
                                                    <CheckCircle size={14} /> Email Verified
                                                </div>
                                            )}
                                            {!isEmailVerified && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid #FDE68A', background: '#FFFBEB' }}>
                                                    <p style={{ margin: 0, color: '#92400E', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                                        Verify your email and create your attendee password from attendee access before you continue with registration.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(getAttendeeAccessPath())}
                                                        style={{
                                                            marginTop: '0.85rem',
                                                            background: '#1E293B',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '0.7rem 1rem',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Go to Attendee Access
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {requireConsent && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                {[
                                                    { id: 'faceDistribution', label: 'I consent to the use of facial recognition technology to identify me in event photographs and securely distribute my images.' },
                                                    { id: 'selfieRegistration', label: 'I consent to the collection and processing of my selfie for identity verification and accurate photo matching.' },
                                                    // { id: 'photographyService', label: 'I consent to being photographed during the event, with the images processed and shared in accordance with the applicable privacy policy.' }
                                                ].map((item) => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setFormData(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                                            padding: '0.75rem 1rem', borderRadius: '12px',
                                                            border: formData[item.id] ? '1px solid #6366F1' : '1px solid #E2E8F0',
                                                            backgroundColor: formData[item.id] ? '#F5F7FF' : 'white',
                                                            cursor: 'pointer', transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{
                                                            minWidth: '20px', width: '20px', height: '20px', borderRadius: '6px',
                                                            border: '2px solid', borderColor: formData[item.id] ? '#6366F1' : '#CBD5E1',
                                                            backgroundColor: formData[item.id] ? '#6366F1' : 'white',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {formData[item.id] && <CheckCircle size={14} color="white" />}
                                                        </div>
                                                        <span style={{ fontWeight: '500', color: '#1E293B', fontSize: '0.85rem', lineHeight: 1.4 }}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={!isEmailVerified || (requireConsent && (!formData.faceDistribution || !formData.selfieRegistration))}
                                            style={{ width: '100%', background: (isEmailVerified && (!requireConsent || (formData.faceDistribution && formData.selfieRegistration))) ? '#4F46E5' : '#94A3B8', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: (isEmailVerified && (!requireConsent || (formData.faceDistribution && formData.selfieRegistration))) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            Continue to Biometrics <ArrowRight size={18} />
                                        </button>

                                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                            <span style={{ color: '#64748B', fontSize: '0.875rem' }}>
                                                Already registered?{' '}
                                                <span onClick={() => navigate('/attendee/access')} style={{ color: '#4F46E5', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>
                                                    Login here
                                                </span>
                                            </span>
                                        </div>
                                    </form>
                                </StandardCard>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
                            >
                                <StandardCard style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white' }}>
                                    
                                    {/* Header Section */}
                                    <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%', position: 'relative' }}>
                                        <button 
                                            onClick={handleBackStep} 
                                            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2C5282', margin: '0 0 0.5rem 0' }}>Click a Selfie</h2>
                                        <p style={{ fontSize: '1rem', color: '#4A5568', margin: 0, fontWeight: '500' }}>Please take a clear selfie for best results</p>
                                    </div>

                                    {/* Main Content Area: 3 Columns (Icons - Camera - Icons) */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: window.innerWidth > 768 ? 'row' : 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '2rem', 
                                        width: '100%' 
                                    }}>
                                        
                                        {/* Left Icons */}
                                        <div style={{ display: 'flex', flexDirection: window.innerWidth > 768 ? 'column' : 'row', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #2C5282', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2C5282' }}>
                                                    <User size={32} strokeWidth={1.5} />
                                                </div>
                                                <span style={{ color: '#2C5282', fontSize: '0.9rem', fontWeight: '700' }}>Only 1 face</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #2C5282', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2C5282' }}>
                                                    <Aperture size={32} strokeWidth={1.5} />
                                                </div>
                                                <span style={{ color: '#2C5282', fontSize: '0.9rem', fontWeight: '700' }}>No blur</span>
                                            </div>
                                        </div>

                                        {/* Center Camera Panel */}
                                        <div style={{ 
                                            position: 'relative', 
                                            width: '100%', 
                                            maxWidth: '400px', 
                                            aspectRatio: '3/4', 
                                            background: '#E2E8F0', 
                                            borderRadius: '8px', 
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}>
                                            {cameraActive ? (
                                                <>
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        onLoadedMetadata={handleVideoLoaded}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                                                    />
                                                </>
                                            ) : selfie ? (
                                                <>
                                                    <img
                                                        src={selfie}
                                                        alt="Scan"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                                                    />
                                                </>
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <button onClick={startCamera} style={{ background: '#2C5282', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                                        Enable Camera
                                                    </button>
                                                </div>
                                            )}
                                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUploadSelfie}
                                                style={{ display: 'none' }}
                                            />
                                        </div>

                                        {/* Right Icons */}
                                        <div style={{ display: 'flex', flexDirection: window.innerWidth > 768 ? 'column' : 'row', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #2C5282', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2C5282' }}>
                                                    {/* Using ShieldAlert as a proxy for "No Mask" */}
                                                    <ShieldAlert size={32} strokeWidth={1.5} />
                                                </div>
                                                <span style={{ color: '#2C5282', fontSize: '0.9rem', fontWeight: '700' }}>No Mask</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #2C5282', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2C5282' }}>
                                                    <Glasses size={32} strokeWidth={1.5} />
                                                </div>
                                                <span style={{ color: '#2C5282', fontSize: '0.9rem', fontWeight: '700' }}>No spectacles</span>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Footer Button Section */}
                                    <div style={{ marginTop: '2.5rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        {!selfie ? (
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={captureSelfie}
                                                    disabled={!videoReady}
                                                    style={{
                                                        background: '#3182CE', color: 'white', border: 'none',
                                                        padding: '0.8rem 2rem', borderRadius: '4px',
                                                        fontSize: '1.05rem', fontWeight: '600', cursor: videoReady ? 'pointer' : 'not-allowed',
                                                        boxShadow: '0 4px 6px rgba(49, 130, 206, 0.3)',
                                                        opacity: videoReady ? 1 : 0.7,
                                                        minWidth: '150px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    <Camera size={18} />
                                                    Take Selfie
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    style={{
                                                        background: 'white', color: '#2B6CB0', border: '1px solid #90CDF4',
                                                        padding: '0.8rem 1.5rem', borderRadius: '4px',
                                                        fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer',
                                                        minWidth: '150px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    <Upload size={18} />
                                                    Upload Photo
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={retakeSelfie}
                                                    style={{
                                                        background: 'white', color: '#4A5568', border: '1px solid #CBD5E0',
                                                        padding: '0.8rem 2rem', borderRadius: '4px',
                                                        fontSize: '1rem', fontWeight: '600', cursor: 'pointer'
                                                    }}
                                                >
                                                    Retake
                                                </button>
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={isSubmitting}
                                                    style={{
                                                        background: '#3182CE', color: 'white', border: 'none',
                                                        padding: '0.8rem 2rem', borderRadius: '4px',
                                                        fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        boxShadow: '0 4px 6px rgba(49, 130, 206, 0.3)'
                                                    }}
                                                >
                                                    {isSubmitting ? <><Loader2 size={18} className="spin-slow" /> Processing...</> : 'Submit Photo'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                </StandardCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin-slow {
                    animation: spin-slow 2s linear infinite;
                }
            `}</style>
        </div>
    );
}

export default AttendeeRegistration;
