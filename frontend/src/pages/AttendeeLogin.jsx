import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle, Smartphone, ShieldCheck, Camera, ArrowLeft } from 'lucide-react'; // Using Camera for logo
import '../landing.css';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';

const AttendeeLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Email Auth State
    const searchParams = new URLSearchParams(location.search);
    const initialEmail = searchParams.get('email') || '';
    const eventId = searchParams.get('eventId');

    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [authStep, setAuthStep] = useState('email'); // 'email' | 'otp'

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);

        try {
            // Direct Login Bypass Check for Attendees
            try {
                const verifyResult = await authAPI.verifyAttendee(email, eventId);
                if (verifyResult.status === 'success' && verifyResult.verified && verifyResult.attendee_id) {
                    addToast("Welcome back!", "success");
                    setTimeout(() => {
                        // If we have an eventId in URL, prioritize the upload page
                        if (eventId) {
                            navigate(`/attendee/${verifyResult.attendee_id}/upload/${eventId}`);
                        } else {
                            // Otherwise go to general welcome/results page
                            navigate(`/attendee/welcome/${verifyResult.attendee_id}`);
                        }
                    }, 800);
                    return; // Stop execution, bypass OTP
                }
            } catch (verifyErr) {
                // If they are not found as an attendee, proceed to normal OTP flow
                console.log("OTP bypass unavailable:", verifyErr.message);
            }

            // Normal OTP Flow
            const result = await authAPI.sendOtp(email, 'LOGIN');
            if (result.status === 'success') {
                if (result.email_sent) {
                    addToast(`OTP Code sent to ${email}`, 'success');
                } else {
                    addToast(`OTP generated (Dev Mode). Check console.`, 'warning');
                    console.log('DEV OTP:', result.debug_otp);
                }
                setAuthStep('otp');
            } else {
                addToast(result.message || 'Failed to send OTP.', 'error');
            }
        } catch (err) {
            console.error('OTP send error:', err);
            addToast('Failed to connect to authentication service.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await authAPI.verifyOtp(email, otp);
            if (result.status === 'success' && result.verified) {
                if (result.attendee_id) {
                    addToast("Welcome back!", "success");
                    // Add a small delay for the user to see the success state
                    setTimeout(() => {
                        navigate(`/attendee/welcome/${result.attendee_id}`);
                    }, 800);
                } else {
                    addToast("Email verified, but no account found.", "warning");
                }
            } else {
                addToast("Invalid code. Please try again.", "error");
            }
        } catch (err) {
            addToast('Verification failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Inter", sans-serif'
        }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
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
                Back to Demo
            </button>
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div style={{
                    position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
                    filter: 'blur(80px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-10%', left: '-10%', width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(52, 211, 153, 0.05) 0%, transparent 70%)',
                    filter: 'blur(80px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2394a3b8\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }} />
            </div>

            <AILoader
                active={loading}
                text={authStep === 'email' ? "SENDING CODE" : "VERIFYING"}
                subtext="Securing your session..."
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10, padding: '1rem' }}
            >
                {/* Brand Logo - Floating above card */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
                            borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.4)'
                        }}>
                            <Camera size={26} strokeWidth={2} />
                        </div>
                        <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#064E3B', letterSpacing: '-0.03em' }}>
                            EventLens
                        </span>
                    </motion.div>
                </div>

                {/* Main Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                    padding: '2.5rem',
                    overflow: 'hidden'
                }}>
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#064E3B', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                            {authStep === 'email' ? 'Welcome Back' : 'Check your Inbox'}
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {authStep === 'email'
                                ? 'Enter your email to access your photos'
                                : `We've sent a 6-digit code to ${email}`
                            }
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {authStep === 'email' ? (
                            <motion.form
                                key="email-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleSendOtp}
                            >
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                                        Email Address
                                    </label>
                                    <div style={{ position: 'relative', transition: 'all 0.2s' }}>
                                        <input
                                            type="email"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                borderRadius: '14px',
                                                border: '2px solid #E2E8F0',
                                                fontSize: '1rem',
                                                outline: 'none',
                                                background: 'white',
                                                transition: 'all 0.2s',
                                                color: '#1E293B',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                            onFocus={(e) => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                        />
                                        <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '1rem',
                                        borderRadius: '14px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: loading ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        opacity: loading || !email ? 0.7 : 1,
                                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
                                    }}
                                    onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                                    onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {loading ? 'Sending Code...' : <>Continue <ArrowRight size={18} /></>}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="otp-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleVerifyOtp}
                            >
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Access Code</label>
                                        <button
                                            type="button"
                                            onClick={() => setAuthStep('email')}
                                            style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: '0' }}
                                        >
                                            Change Email
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            required
                                            autoFocus
                                            maxLength={6}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3.5rem',
                                                borderRadius: '14px',
                                                border: '2px solid #E2E8F0',
                                                fontSize: '1.5rem',
                                                letterSpacing: '0.35em',
                                                fontFamily: 'monospace',
                                                outline: 'none',
                                                background: 'white',
                                                textAlign: 'center',
                                                color: '#1E293B',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                            onFocus={(e) => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                        />
                                        <Lock size={22} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length < 6}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '1rem',
                                        borderRadius: '14px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: loading ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        opacity: loading || otp.length < 6 ? 0.7 : 1,
                                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
                                    }}
                                    onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                                    onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {loading ? 'Verifying...' : <>Confirm & Login <CheckCircle size={18} /></>}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                            New here? Register via the link in your <span style={{ color: '#10B981', fontWeight: '600' }}>invitation email</span>.
                        </p>
                    </div>
                </div>

                {/* Security Badge */}
                <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.8rem' }}>
                    <ShieldCheck size={14} />
                    <span>Secure end-to-end encrypted session</span>
                </div>
            </motion.div>
        </div>
    );
};

export default AttendeeLogin;
