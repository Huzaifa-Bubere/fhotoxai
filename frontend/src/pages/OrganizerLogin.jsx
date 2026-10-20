import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import '../landing.css';
import { useToast } from '../context/ToastContext';

const OrganizerLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Support URL ?email= params for invitation-style redirects.
    const searchParams = new URLSearchParams(location.search);
    const initialEmail = searchParams.get('email') || '';

    const [formData, setFormData] = useState({
        email: initialEmail,
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

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
        addToast("Authenticating credentials...", "processing");

        try {
            const { organizerAPI, clearStoredAuth } = await import('../services/api.js');
            clearStoredAuth();
            const result = await organizerAPI.login(formData);

            if (result.status === 'success') {
                const searchParams = new URLSearchParams(location.search);
                const requestedRedirect = searchParams.get('redirect');
                const userRole = (result.user?.role || '').toLowerCase();

                if (userRole === 'photographer') {
                    localStorage.setItem('photographer_user', JSON.stringify(result.user));
                    addToast("Photographer login successful.", "success");
                    setTimeout(() => navigate(requestedRedirect || '/photographer/dashboard'), 500);
                    return;
                }

                if (userRole === 'attendee') {
                    addToast("Use attendee access to continue.", "warning");
                    const attendeeEmail = encodeURIComponent(result.user?.email || formData.email);
                    setTimeout(() => navigate(`/attendee/access?email=${attendeeEmail}`), 500);
                    return;
                }

                localStorage.setItem('organizer_user', JSON.stringify(result.user));
                addToast("Authentication Successful. Access Granted.", "success");
                setTimeout(() => navigate(requestedRedirect || '/organizer/events'), 500);
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error(error);
            addToast(error.message || "Authentication Failed. Access Denied.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: 'calc(100dvh - 76px)',
            height: 'auto',
            width: '100%',
            backgroundColor: '#fffdf9',
            backgroundImage: 'radial-gradient(rgba(37,30,24,0.08) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            color: '#1f1f1f',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
            fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
            position: 'relative'
        }}>
            {/* Ambient Indigo Glow (Top Center) */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120%',
                height: '600px',
                background: 'radial-gradient(50% 50% at 50% 50%, rgba(245, 130, 31, 0.1) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                style={{
                    position: 'relative',
                    top: 'auto',
                    left: 'auto',
                    alignSelf: 'flex-start',
                    margin: '1rem 2rem 0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#666666',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    zIndex: 50,
                    transition: 'color 0.2s',
                    fontSize: '0.95rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#1f1f1f'}
                onMouseOut={(e) => e.currentTarget.style.color = '#666666'}
            >
                <ArrowLeft size={18} />
                Back to Home
            </button>

            {/* Secondary Bottom-Right Glow (Soft Violet) */}
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '800px',
                height: '800px',
                background: 'radial-gradient(50% 50% at 50% 50%, rgba(245, 130, 31, 0.08) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />
            <div className="container" style={{ minHeight: 'calc(100dvh - 150px)', flex: '1 0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem 2rem', position: 'relative', zIndex: 10 }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="registration-card"
                    style={{
                        maxWidth: '450px',
                        width: '100%',
                        backgroundColor: 'white',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                        border: '1px solid rgba(37,30,24,0.08)',
                        color: '#1f1f1f',
                        borderRadius: '16px',
                        padding: '2.5rem'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            style={{
                                display: 'inline-flex',
                                padding: '1rem',
                                borderRadius: '50%',
                                background: '#FFF8F2',
                                marginBottom: '1.5rem',
                                border: '1px solid rgba(37,30,24,0.08)'
                            }}
                        >
                            <ShieldCheck size={32} style={{ color: '#f5821f' }} />
                        </motion.div>
                        <h2 className="login-header-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#1f1f1f', fontWeight: '700' }}>
                            Organizer Login
                        </h2>
                        <p className="login-header-description" style={{ fontSize: '0.9rem', color: '#666666' }}>
                            Secure portal for event and system management
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label className="form-label" style={{ color: '#444444', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999999' }} />
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', backgroundColor: '#fffdf9', color: '#1f1f1f', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                    placeholder="organizer@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ color: '#444444', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999999' }} />
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', backgroundColor: '#fffdf9', color: '#1f1f1f', border: '1px solid rgba(245,130,31,0.18)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', padding: '0.9rem', backgroundColor: '#f5821f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(217, 109, 19, 0.3)', transition: 'all 0.2s' }}
                            disabled={loading}
                        >
                            {loading ? (
                                'Authenticating...'
                            ) : (
                                <>
                                    Connect to Dashboard <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(37,30,24,0.06)', paddingTop: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#666666', textAlign: 'center' }}>
                            New organizer?
                        </p>
                        <Link
                            to="/organizer/register"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                padding: '0.95rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(245,130,31,0.2)',
                                background: '#FFF5EB',
                                textDecoration: 'none',
                                color: '#1f1f1f',
                                marginBottom: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '12px',
                                    background: '#FDDCB5',
                                    color: '#d86d13',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Organizer Registration</div>
                                    <div style={{ fontSize: '0.8rem', color: '#d86d13' }}>Create a new organizer account to manage events</div>
                                </div>
                            </div>
                            <ArrowRight size={16} style={{ color: '#f5821f' }} />
                        </Link>

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OrganizerLogin;
