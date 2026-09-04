import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Building, ArrowRight, Camera, BadgeCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// --- Shared Components (Mature SaaS) ---

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
            maxWidth: '500px',
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

const PhotographerRegister = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        organization: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { organizerAPI } = await import('../services/api.js');
            // Reusing organizer registration for generic user creation
            const result = await organizerAPI.register({ ...formData, role: 'photographer' });

            if (result.status === 'success') {
                addToast('Profile Created! Please login.', 'success');
                navigate('/photographer/login');
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error(error);
            addToast(error.message || "Registration failed", "error");
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
            padding: '2rem 1rem'
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
                        Join the Network
                    </h2>
                    <p style={{ color: '#666666', fontSize: '1rem', lineHeight: 1.5 }}>
                        Create a professional profile to manage event assets.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <InputField
                        label="Full Name"
                        icon={User}
                        name="name"
                        placeholder="Jane Lens"
                        value={formData.name}
                        onChange={handleChange}
                    />

                    <InputField
                        label="Studio / Agency"
                        icon={Building}
                        name="organization"
                        placeholder="Freelance / Studio X"
                        value={formData.organization}
                        onChange={handleChange}
                    />

                    <InputField
                        label="Email Address"
                        icon={Mail}
                        name="email"
                        type="email"
                        placeholder="jane@photos.com"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <InputField
                        label="Password"
                        icon={Lock}
                        name="password"
                        type="password"
                        placeholder="Create a strong password"
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
                        {loading ? 'Registering Profile...' : (
                            <>Create Account <ArrowRight size={18} /></>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(37,30,24,0.06)', paddingTop: '1.5rem' }}>
                    <p style={{ color: '#666666', fontSize: '0.9rem' }}>
                        Already have an account?{' '}
                        <Link
                            to="/photographer/login"
                            style={{ color: '#d86d13', fontWeight: '600', textDecoration: 'none' }}
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </StandardCard>

            <div style={{
                position: 'absolute', bottom: '1rem',
                display: 'flex', gap: '2rem',
                color: '#999999', fontSize: '0.875rem'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BadgeCheck size={14} /> Photographer Network</span>
            </div>

        </div>
    );
};

export default PhotographerRegister;
