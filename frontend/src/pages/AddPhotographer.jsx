import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Building, Camera, ArrowLeft } from 'lucide-react';
import '../landing.css';
import { useToast } from '../context/ToastContext';
// Sidebar removed

const AddPhotographer = () => {
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
            // Using generic register for now, but specifying role
            const result = await organizerAPI.register({ ...formData, role: 'photographer' });

            if (result.status === 'success') {
                addToast('Photographer added successfully!', 'success');
                navigate('/organizer/events');
            } else {
                throw new Error(result.message || 'Failed to add photographer');
            }
        } catch (error) {
            console.error(error);
            addToast(error.message || "Failed to add photographer", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh', // Use dvh for mobile browsers
            width: '100vw',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            color: '#1E293B',
            fontFamily: '"Inter", -apple-system, sans-serif',
        }}>
            {/* Ambient Glows */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '400px', background: 'radial-gradient(50% 50% at 50% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Header */}
            <header style={{
                padding: '1rem 2rem',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
                <Link to="/organizer/events" style={{ padding: '0.5rem', borderRadius: '8px', color: '#64748B', display: 'flex' }}>
                    <ArrowLeft size={20} />
                </Link>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>Team Management</h1>
            </header>

            <div className="add-photographer-container" style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="add-photographer-card"
                    style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '14px',
                            background: '#F0F9FF', border: '1px solid #E0F2FE',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1.5rem', color: '#0EA5E9'
                        }}>
                            <Camera size={28} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.75rem' }}>
                            Add Photographer
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: 1.5 }}>
                            Create a new account for a staff member to upload photos.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="text"
                                    name="name"
                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#1E293B', outline: 'none', background: '#F8FAFC' }}
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#6366F1'; }}
                                    onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Organization / Studio</label>
                            <div style={{ position: 'relative' }}>
                                <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="text"
                                    name="organization"
                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#1E293B', outline: 'none', background: '#F8FAFC' }}
                                    placeholder="Enter organization"
                                    value={formData.organization}
                                    onChange={handleChange}
                                    required
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#6366F1'; }}
                                    onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="email"
                                    name="email"
                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#1E293B', outline: 'none', background: '#F8FAFC' }}
                                    placeholder="Enter email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#6366F1'; }}
                                    onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Temporary Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="password"
                                    name="password"
                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#1E293B', outline: 'none', background: '#F8FAFC' }}
                                    placeholder="Create temporary password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#6366F1'; }}
                                    onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                                color: 'white',
                                border: 'none',
                                fontWeight: '600',
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
                                marginTop: '1rem',
                                transition: 'transform 0.2s',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                            {loading ? 'Creating Account...' : 'Add Photographer'}
                        </button>
                    </form>
                </motion.div>
            </div>

            <style>{`
                .add-photographer-container {
                    padding: 3rem 2rem;
                }
                .add-photographer-card {
                    padding: 2.5rem;
                }
                
                @media (max-width: 640px) {
                    .add-photographer-container {
                        padding: 1.5rem 1rem;
                    }
                    .add-photographer-card {
                        padding: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default AddPhotographer;
