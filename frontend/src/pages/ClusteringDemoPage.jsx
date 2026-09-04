import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Calendar, ArrowRight, Users, Check, Activity, Server, Zap, X } from 'lucide-react';
import '../landing.css';
import { useToast } from '../context/ToastContext';



const ClusteringDemoPage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const handleDemoLogin = (persona) => {
        if (persona === 'organizer') {
            navigate('/organizer/login');
        } else if (persona === 'photographer') {
            navigate('/photographer/login');
        } else if (persona === 'attendee') {
            navigate('/attendee/access');
        }
    };

    return (
        <div className="demo-page-light">
            <div className="ambient-bg">
                <div className="ambient-blob blob-1" />
                <div className="ambient-blob blob-2" />
            </div>

            <div className="demo-container">
                <div className="demo-split-layout">
                    {/* Left Side: Content & Context */}
                    <div className="demo-content-side">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="demo-badge"
                        >
                            <span className="demo-badge-dot" />
                            LIVE DEMO ENVIRONMENT
                        </motion.div>

                        <h1 className="demo-title-large">
                            Event Photography<br />
                            <span>Clustering Suite</span>
                        </h1>

                        <p className="demo-description">
                            Experience the complete AI pipeline from ingestion to retrieval.
                            Select a persona to enter the secure environment and test our
                            proprietary clustering algorithms in real-time.
                        </p>



                        {/* <div className="demo-feature-list">
                            <div className="demo-feature-item">
                                <div className="demo-feature-icon">
                                    <Check size={18} strokeWidth={3} />
                                </div>
                                <span>Real-time FaceNet Vector Embeddings</span>
                            </div>
                            <div className="demo-feature-item">
                                <div className="demo-feature-icon">
                                    <Check size={18} strokeWidth={3} />
                                </div>
                                <span>Binary K-Means Clustering</span>
                            </div> 
                            <div className="demo-feature-item">
                                <div className="demo-feature-icon">
                                    <Check size={18} strokeWidth={3} />
                                </div>
                                <span>Privacy-First Data Handling</span>
                            </div>
                        </div> */}

                        {/* <div className="demo-status-panel">
                            <div className="status-item">
                                <span className="status-label">System Status</span>
                                <span className="status-value">
                                    <span className="status-dot" /> Online
                                </span>
                            </div>
                            <div className="status-item">
                                <span className="status-label">Active Nodes</span>
                                <span className="status-value">
                                    <Server size={14} /> 3/3
                                </span>
                            </div>
                            <div className="status-item">
                                <span className="status-label">Model Latency</span>
                                <span className="status-value">
                                    <Zap size={14} /> &lt;100ms
                                </span>
                            </div>
                        </div> */}
                    </div>

                    {/* Right Side: Action Cards */}
                    <div className="demo-cards-side">
                        {/* Organizer Card - Full Width */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{
                                y: -6,
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
                            }}
                            transition={{ delay: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                            onClick={() => handleDemoLogin('organizer')}
                            className="demo-card card-organizer"
                            style={{
                                border: 'none',
                                backgroundColor: 'white',
                                borderRadius: '1rem',
                                padding: '2.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="card-title">Organizer Portal</h3>
                                    <p className="card-text mb-0">
                                        Manage events, monitor live ingestion, and view cluster analytics.
                                    </p>
                                </div>
                                <div className="card-icon-wrapper mb-0 ml-4 shrink-0">
                                    <Calendar size={28} strokeWidth={1.5} />
                                </div>
                            </div>
                            <div className="card-action mt-6">
                                Launch Console <ArrowRight size={18} />
                            </div>
                        </motion.div>

                    </div>
                </div>
            </div>

            {/* Subtle Attendee Icon (Bottom Left) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                    position: 'fixed',
                    bottom: '1.5rem',
                    left: '1.5rem',
                    zIndex: 100
                }}
            >
                <button
                    onClick={() => handleDemoLogin('attendee')}
                    title="Attendee Portal"
                    style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '1.25rem',
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.color = '#4F46E5';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <Users size={24} strokeWidth={1.5} />
                </button>
            </motion.div>

        </div>
    );
};

export default ClusteringDemoPage;
