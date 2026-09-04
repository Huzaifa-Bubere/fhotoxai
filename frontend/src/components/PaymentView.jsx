import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Zap, CreditCard, Lock } from 'lucide-react';

const PaymentView = ({ onBack, onSuccess, formData }) => {
    const [billing, setBilling] = useState({
        address: '123 Event Horizon Blvd',
        city: 'Bangalore',
        pin: '560001',
        state: 'Karnataka',
        agree: true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setBilling(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePay = (e) => {
        e.preventDefault();
        if (!billing.agree) {
            alert("Please agree to the Terms of Service.");
            return;
        }
        onSuccess();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
                width: '100%',
                minHeight: '100vh',
                background: '#F8F9FE', // Light blue-ish gray background from screenshot
                fontFamily: '"Inter", sans-serif',
                color: '#1e293b',
                paddingTop: '2rem',
                paddingBottom: '4rem'
            }}
        >
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
                {/* Back Button */}
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#64748B',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        marginBottom: '2rem'
                    }}
                >
                    <ChevronLeft size={20} /> Back
                </button>

                {/* Header Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: '#EEF2FF',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6366F1',
                        marginBottom: '1.5rem'
                    }}>
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                        Premium Event Plan
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '1.05rem' }}>
                        One-time activation for your secure event memories.
                    </p>
                </div>

                {/* Pricing Card */}
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '3rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem', color: '#64748B' }}>
                        <span>Activation Fee</span>
                        <span style={{ fontWeight: '600', color: '#1E293B' }}>$16.99</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1rem', color: '#64748B' }}>
                        <span>Processing Fee & Tax</span>
                        <span style={{ fontWeight: '600', color: '#1E293B' }}>$3.00</span>
                    </div>
                    <div style={{ height: '1px', background: '#F1F5F9', marginBottom: '1.5rem' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A' }}>Total</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6366F1' }}>$19.99</span>
                    </div>
                </div>

                {/* Billing Information */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <CreditCard size={24} color="#0F172A" />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0F172A', margin: 0 }}>Billing Information</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Organizer Name</label>
                                <input
                                    type="text"
                                    value={formData?.ownerName || 'John Doe'}
                                    readOnly
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#64748B', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Email Address</label>
                                <input
                                    type="email"
                                    value={formData?.ownerEmail || 'john@example.com'}
                                    readOnly
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#64748B', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Street Address</label>
                            <input
                                name="address"
                                type="text"
                                placeholder="e.g., 123 Business Way"
                                value={billing.address}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', background: 'white' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>City</label>
                                <input
                                    name="city"
                                    type="text"
                                    value={billing.city}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', background: '#F8FAFC' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Pincode</label>
                                <input
                                    name="pin"
                                    type="text"
                                    value={billing.pin}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', background: '#F8FAFC' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>State</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        name="state"
                                        value={billing.state}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', appearance: 'none', background: 'white' }}
                                    >
                                        <option value="Karnataka">Karnataka</option>
                                        <option value="Maharashtra">Maharashtra</option>
                                        <option value="Delhi">Delhi</option>
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="terms"
                                name="agree"
                                checked={billing.agree}
                                onChange={handleChange}
                                style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: '#6366F1', cursor: 'pointer' }}
                            />
                            <label htmlFor="terms" style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', cursor: 'pointer' }}>
                                I agree to the <span style={{ color: '#6366F1', fontWeight: '600' }}>Terms of Service</span>. Payment for event processing is non-refundable once the first photo is processed.
                            </label>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handlePay}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Lock size={18} /> Complete Payment & Save
                        </motion.button>

                        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8' }}>
                            Secure Transaction powered by <span style={{ fontWeight: '700', color: '#334155' }}>Razorpay</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PaymentView;
