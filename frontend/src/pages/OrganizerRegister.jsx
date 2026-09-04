import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Building, ArrowRight, Shield, Phone } from 'lucide-react';
import '../landing.css';
import HeroBackground from '../components/landing/HeroBackground';
import TypingText from '../components/TypingText';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';

const OrganizerRegister = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            addToast("Passwords do not match.", "error");
            return;
        }

        setLoading(true);
        // addToast("Creating secure organizer account...", "processing");

        try {
            const { organizerAPI } = await import('../services/api.js');
            const result = await organizerAPI.register(formData);

            if (result.status === 'success') {
                addToast("Account Created. Welcome to the Network.", "success");
                setTimeout(() => navigate('/organizer/login'), 1000);
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error(error);
            addToast(error.message || "Registration Failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="landing-page">
            <HeroBackground />

            <AILoader
                active={loading}
                text="ALLOCATING SECURE STORAGE"
                subtext="Provisioning encrypted event space..."
            />

            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', position: 'relative', zIndex: 10 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="registration-card"
                    style={{ maxWidth: '500px', width: '100%' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            display: 'inline-flex',
                            padding: '1rem',
                            borderRadius: '50%',
                            background: 'hsl(var(--secondary))',
                            marginBottom: '1.5rem',
                            border: '1px solid hsl(var(--border))'
                        }}>
                            <Shield size={32} className="text-primary" />
                        </div>
                        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                            Initialize Org Portal
                        </h2>
                        <p className="hero-description" style={{ fontSize: '0.9rem' }}>
                            Create your secure environment for AI event processing
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Organization / Agency</label>
                            <div style={{ position: 'relative' }}>
                                <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="text"
                                    name="organization"
                                    className="form-input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="Event Horizon Ltd."
                                    value={formData.organization}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Work Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="contact@eventhorizon.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="form-input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-checkbox-group" style={{ marginBottom: '1.5rem' }}>
                            <input type="checkbox" id="terms" className="form-checkbox" required />
                            <label htmlFor="terms" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                I agree to the <strong>Data Processing Agreement</strong> regarding the handling of biometric data for event attendees.
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            disabled={loading}
                        >
                            {loading ? 'Initializing Interface...' : 'Establish Organization Access'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
                        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
                            Already integrated?{' '}
                            <Link to="/organizer/login" style={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}>
                                Access Portal
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OrganizerRegister;
