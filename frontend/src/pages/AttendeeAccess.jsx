import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import '../landing.css';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';

const buildRegistrationPath = (email, eventId, name = '') => {
    const params = new URLSearchParams();
    if (eventId) {
        params.set('eventId', eventId);
    }
    params.set('email', email);
    if (name) {
        params.set('name', name);
    }
    params.set('verified', 'true');
    return `/attendee-registration?${params.toString()}`;
};

const getLoaderText = (mode, step) => {
    if (mode === 'password') return 'SIGNING IN';
    if (mode === 'signup' && step === 'otp') return 'CREATING ACCOUNT';
    return 'SENDING CODE';
};

function AttendeeAccess() {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();

    const searchParams = new URLSearchParams(location.search);
    const initialEmail = searchParams.get('email') || '';
    const eventId = searchParams.get('eventId') || '';
    const redirectTarget = searchParams.get('redirect') || '';

    const [mode, setMode] = useState('otp');
    const [loading, setLoading] = useState(false);

    const [otpEmail, setOtpEmail] = useState(initialEmail);
    const [otpCode, setOtpCode] = useState('');
    const [otpStep, setOtpStep] = useState('email');

    const [passwordForm, setPasswordForm] = useState({
        email: initialEmail,
        password: '',
    });

    const [signupForm, setSignupForm] = useState({
        name: '',
        email: initialEmail,
        password: '',
        otp: '',
    });
    const [signupStep, setSignupStep] = useState('details');

    useEffect(() => {
        if (location.state?.authExpiredMessage) {
            addToast(location.state.authExpiredMessage, 'error');
        }
    }, [addToast, location.state]);

    const handleBack = () => {
        if (mode === 'otp' && otpStep === 'otp') {
            setOtpStep('email');
            setOtpCode('');
            return;
        }

        if (mode === 'signup' && signupStep === 'otp') {
            setSignupStep('details');
            setSignupForm((current) => ({ ...current, otp: '' }));
            return;
        }

        if (eventId) {
            navigate(`/event/${eventId}`);
            return;
        }

        navigate('/');
    };

    const resetToMode = (nextMode) => {
        setMode(nextMode);
        setOtpStep('email');
        setOtpCode('');
        setSignupStep('details');
        setSignupForm((current) => ({ ...current, otp: '' }));
    };

    const navigateAfterAuth = (result, email, fallbackName = '') => {
        if (result.attendee_id) {
            const targetPath = redirectTarget || `/attendee/welcome/${result.attendee_id}`;
            setTimeout(() => navigate(targetPath), 500);
            return;
        }

        const registrationPath = buildRegistrationPath(
            email,
            eventId || result.event_id || '',
            result?.user?.full_name || fallbackName,
        );
        setTimeout(() => navigate(registrationPath), 500);
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!otpEmail) return;

        setLoading(true);
        try {
            const result = await authAPI.sendOtp(otpEmail, eventId || '0');
            if (result.status === 'success') {
                addToast(`OTP sent to ${otpEmail}`, 'success');
                if (result.otp_hint) {
                    addToast(`Demo OTP: ${result.otp_hint}`, 'info');
                }
                setOtpStep('otp');
                return;
            }

            addToast(result.message || 'Failed to send OTP.', 'error');
        } catch (error) {
            console.error('OTP send error:', error);
            addToast(error.message || 'Failed to send OTP.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otpCode.length < 6) return;

        setLoading(true);
        try {
            const result = await authAPI.verifyOtp(otpEmail, otpCode, eventId || undefined);
            if (!result?.verified) {
                addToast('Invalid code. Please try again.', 'error');
                return;
            }

            addToast('Access verified.', 'success');
            navigateAfterAuth(result, otpEmail);
        } catch (error) {
            console.error('OTP verify error:', error);
            addToast(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        if (!passwordForm.email || !passwordForm.password) return;

        setLoading(true);
        try {
            const result = await authAPI.attendeeLogin(passwordForm.email, passwordForm.password, eventId || undefined);
            addToast('Login successful.', 'success');
            navigateAfterAuth(result, passwordForm.email);
        } catch (error) {
            console.error('Password login error:', error);
            addToast(error.message || 'Password login failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendSignupOtp = async (e) => {
        e.preventDefault();
        if (!signupForm.name || !signupForm.email || !signupForm.password) {
            addToast('Please fill in your name, email, and password.', 'error');
            return;
        }

        if (signupForm.password.length < 8) {
            addToast('Password must be at least 8 characters.', 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await authAPI.sendOtp(signupForm.email, eventId || '0');
            if (result.status === 'success') {
                addToast(`OTP sent to ${signupForm.email}`, 'success');
                if (result.otp_hint) {
                    addToast(`Demo OTP: ${result.otp_hint}`, 'info');
                }
                setSignupStep('otp');
                return;
            }

            addToast(result.message || 'Failed to send OTP.', 'error');
        } catch (error) {
            console.error('Signup OTP error:', error);
            addToast(error.message || 'Failed to send OTP.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteSignup = async (e) => {
        e.preventDefault();
        if (signupForm.otp.length < 6) return;

        setLoading(true);
        try {
            const result = await authAPI.attendeeSignup({
                name: signupForm.name,
                email: signupForm.email,
                password: signupForm.password,
                otp: signupForm.otp,
                eventId: eventId || undefined,
            });
            addToast('Account created successfully.', 'success');
            navigateAfterAuth(result, signupForm.email, signupForm.name);
        } catch (error) {
            console.error('Signup completion error:', error);
            addToast(error.message || 'Could not create your attendee account.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderOtpForm = () => (
        <AnimatePresence mode="wait">
            {otpStep === 'email' ? (
                <motion.form
                    key="otp-email"
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
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={otpEmail}
                                onChange={(e) => setOtpEmail(e.target.value)}
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
                            />
                            <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading || !otpEmail} style={primaryButtonStyle(loading || !otpEmail)}>
                        Continue <ArrowRight size={18} />
                    </button>
                </motion.form>
            ) : (
                <motion.form
                    key="otp-code"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleVerifyOtp}
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Access Code</label>
                            <button type="button" onClick={() => setOtpStep('email')} style={inlineLinkStyle}>
                                Change Email
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                required
                                autoFocus
                                maxLength={6}
                                style={otpInputStyle}
                            />
                            <KeyRound size={22} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading || otpCode.length < 6} style={primaryButtonStyle(loading || otpCode.length < 6)}>
                        Confirm Access <CheckCircle size={18} />
                    </button>
                </motion.form>
            )}
        </AnimatePresence>
    );

    const renderPasswordForm = () => (
        <motion.form
            key="password-login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handlePasswordLogin}
        >
            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                    Email Address
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="email"
                        placeholder="name@example.com"
                        value={passwordForm.email}
                        onChange={(e) => setPasswordForm((current) => ({ ...current, email: e.target.value }))}
                        required
                        autoFocus
                        style={textInputStyle}
                    />
                    <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                    Password
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={passwordForm.password}
                        onChange={(e) => setPasswordForm((current) => ({ ...current, password: e.target.value }))}
                        required
                        style={textInputStyle}
                    />
                    <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
            </div>

            <button type="submit" disabled={loading || !passwordForm.email || !passwordForm.password} style={primaryButtonStyle(loading || !passwordForm.email || !passwordForm.password)}>
                Sign In <ArrowRight size={18} />
            </button>
        </motion.form>
    );

    const renderSignupForm = () => (
        <AnimatePresence mode="wait">
            {signupStep === 'details' ? (
                <motion.form
                    key="signup-details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSendSignupOtp}
                >
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                            Full Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Jane Doe"
                                value={signupForm.name}
                                onChange={(e) => setSignupForm((current) => ({ ...current, name: e.target.value }))}
                                required
                                autoFocus
                                style={textInputStyle}
                            />
                            <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                            Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={signupForm.email}
                                onChange={(e) => setSignupForm((current) => ({ ...current, email: e.target.value }))}
                                required
                                style={textInputStyle}
                            />
                            <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                            Create Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                placeholder="At least 8 characters"
                                value={signupForm.password}
                                onChange={(e) => setSignupForm((current) => ({ ...current, password: e.target.value }))}
                                required
                                minLength={8}
                                style={textInputStyle}
                            />
                            <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !signupForm.name || !signupForm.email || signupForm.password.length < 8}
                        style={primaryButtonStyle(loading || !signupForm.name || !signupForm.email || signupForm.password.length < 8)}
                    >
                        Send Verification Code <ArrowRight size={18} />
                    </button>
                </motion.form>
            ) : (
                <motion.form
                    key="signup-otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCompleteSignup}
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Verification Code</label>
                            <button type="button" onClick={() => setSignupStep('details')} style={inlineLinkStyle}>
                                Edit Details
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="000000"
                                value={signupForm.otp}
                                onChange={(e) => setSignupForm((current) => ({ ...current, otp: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }))}
                                required
                                autoFocus
                                maxLength={6}
                                style={otpInputStyle}
                            />
                            <KeyRound size={22} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading || signupForm.otp.length < 6} style={primaryButtonStyle(loading || signupForm.otp.length < 6)}>
                        Create Account <CheckCircle size={18} />
                    </button>
                </motion.form>
            )}
        </AnimatePresence>
    );

    const titleMap = {
        otp: otpStep === 'email' ? 'Access Your Photos' : 'Check your inbox',
        password: 'Sign In with Password',
        signup: signupStep === 'details' ? 'Create Attendee Account' : 'Verify Your Email',
    };

    const descriptionMap = {
        otp: otpStep === 'email'
            ? 'Use a one-time code from your email, then we will open your gallery or continue to registration.'
            : `Enter the 6-digit code sent to ${otpEmail}`,
        password: 'Use your attendee email and password to continue.',
        signup: signupStep === 'details'
            ? 'Create a password once, verify your email, and then you can log in using either OTP or password.'
            : `Enter the 6-digit code sent to ${signupForm.email}`,
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
            <button onClick={handleBack} style={backButtonStyle} onMouseOver={(e) => e.currentTarget.style.color = '#1E293B'} onMouseOut={(e) => e.currentTarget.style.color = '#64748B'}>
                <ArrowLeft size={18} />
                Back
            </button>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(52, 211, 153, 0.05) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    borderRadius: '50%'
                }} />
            </div>

            <AILoader
                active={loading}
                text={getLoaderText(mode, mode === 'signup' ? signupStep : otpStep)}
                subtext="Preparing secure attendee access..."
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 10, padding: '1rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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

                <div style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                    padding: '2.5rem',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem', background: '#F8FAFC', padding: '0.35rem', borderRadius: '16px' }}>
                        {[
                            { id: 'otp', label: 'OTP' },
                            { id: 'password', label: 'Password' },
                            { id: 'signup', label: 'Sign Up' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => resetToMode(item.id)}
                                style={{
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '0.8rem 0.5rem',
                                    background: mode === item.id ? 'white' : 'transparent',
                                    color: mode === item.id ? '#064E3B' : '#64748B',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: mode === item.id ? '0 4px 10px rgba(15, 23, 42, 0.08)' : 'none',
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#064E3B', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                            {titleMap[mode]}
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {descriptionMap[mode]}
                        </p>
                    </div>

                    {mode === 'otp' && renderOtpForm()}
                    {mode === 'password' && renderPasswordForm()}
                    {mode === 'signup' && renderSignupForm()}

                    <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                            If you do not have an event link, sign up here and choose from active events during registration.
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.8rem' }}>
                    <ShieldCheck size={14} />
                    <span>Secure attendee session</span>
                </div>
            </motion.div>
        </div>
    );
}

const backButtonStyle = {
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
};

const inlineLinkStyle = {
    background: 'none',
    border: 'none',
    color: '#10B981',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0'
};

const textInputStyle = {
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
};

const otpInputStyle = {
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
};

const primaryButtonStyle = (disabled) => ({
    width: '100%',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    opacity: disabled ? 0.7 : 1,
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
});

export default AttendeeAccess;
