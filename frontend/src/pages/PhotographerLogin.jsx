import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Camera, User, BadgeCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// --- Shared Components ---

const StandardCard = ({ children, style = {} }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            background: 'white',
            border: '1px solid rgba(37,30,24,0.08)',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
            width: '100%',
            maxWidth: '440px',
            position: 'relative',
            zIndex: 10,
            ...style
        }}
    >
        {children}
    </motion.div>
);

const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, name }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999999', display: 'flex' }}>
                <Icon size={18} />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(245,130,31,0.18)',
                    fontSize: '0.95rem',
                    color: '#1f1f1f',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#fffdf9'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = '#f5821f';
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = '0 0 0 3px rgba(245, 130, 31, 0.1)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(245,130,31,0.18)';
                    e.target.style.background = '#fffdf9';
                    e.target.style.boxShadow = 'none';
                }}
            />
        </div>
    </div>
);

const PhotographerLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        email: new URLSearchParams(location.search).get('email') || '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (location.state?.authExpiredMessage) {
            addToast(location.state.authExpiredMessage, "error");
        }
    }, [addToast, location.state]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { photographerAPI, clearStoredAuth } = await import('../services/api.js');
            clearStoredAuth();
            const result = await photographerAPI.login(formData);

            if (result.status === 'success') {
                const searchParams = new URLSearchParams(location.search);
                const requestedRedirect = searchParams.get('redirect');
                const userRole = (result.user?.role || '').toLowerCase();

                if (userRole === 'organizer' || userRole === 'admin') {
                    localStorage.setItem('organizer_user', JSON.stringify(result.user));
                    addToast("Organizer account detected. Redirecting to organizer portal.", "success");
                    setTimeout(() => navigate(requestedRedirect || '/organizer/events'), 500);
                    return;
                }

                if (userRole === 'attendee') {
                    addToast("Use attendee access to continue.", "warning");
                    const attendeeEmail = encodeURIComponent(result.user?.email || formData.email);
                    setTimeout(() => navigate(`/attendee/access?email=${attendeeEmail}`), 500);
                    return;
                }

                localStorage.setItem('photographer_user', JSON.stringify(result.user));
                addToast("Credentials Verified. Access Granted.", "success");
                setTimeout(() => navigate(requestedRedirect || '/photographer/dashboard'), 500);
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error(error);
            addToast(error.message || "Access Denied. Invalid Credentials.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fffdf9',
            fontFamily: '"Inter", -apple-system, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            padding: '1rem'
        }}>
            {/* Ambient Background */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'radial-gradient(rgba(37,30,24,0.08) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '600px', background: 'radial-gradient(50% 50% at 50% 0%, rgba(245, 130, 31, 0.08) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 0 }} />

            <StandardCard>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        style={{
                            width: '64px', height: '64px',
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid rgba(37,30,24,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <Camera size={32} color="#f5821f" />
                    </motion.div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1f1f1f', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
                        Photographer Access
                    </h2>
                    <p style={{ color: '#666666', fontSize: '1rem', lineHeight: 1.5 }}>
                        Secure gateway for media professionals to upload and manage event assets.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <InputField
                        label="Work Email or Username"
                        icon={Mail}
                        name="email"
                        type="text"
                        placeholder="photographer@agency.com"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <InputField
                        label="Password"
                        icon={Lock}
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #d86d13 0%, #f5821f 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.875rem',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: loading ? 'wait' : 'pointer',
                            marginTop: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(217, 109, 19, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Verifying Credentials...' : (
                            <>Sign In to Dashboard <ArrowRight size={18} /></>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(37,30,24,0.06)', paddingTop: '1.5rem' }}>
                    <p style={{ color: '#666666', fontSize: '0.9rem' }}>
                        New to the platform?{' '}
                        <Link
                            to="/photographer/register"
                            style={{ color: '#d86d13', fontWeight: '600', textDecoration: 'none' }}
                        >
                            Register account
                        </Link>
                    </p>
                </div>
            </StandardCard>

            <div style={{
                position: 'absolute', bottom: '2rem',
                display: 'flex', gap: '2rem',
                color: '#999999', fontSize: '0.875rem'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BadgeCheck size={14} /> Encrypted Session</span>
                <span>v2.4.0-stable</span>
            </div>

        </div>
    );
};

export default PhotographerLogin;
