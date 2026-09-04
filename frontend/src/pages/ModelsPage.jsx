import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from '../components/Hero';
import Demo from '../components/models/Demo';

function ModelsPage() {
    const [showDemo, setShowDemo] = useState(false);
    const [activeDemoType, setActiveDemoType] = useState('');

    // Handle scroll events to update active section (Legacy Logic)
    useEffect(() => {
        // Only if we want to track scrolling within this page
        const handleOpenFaceRecognitionDemo = () => {
            setActiveDemoType('face-recognition');
            setShowDemo(true);
        };

        window.addEventListener('openFaceRecognitionDemo', handleOpenFaceRecognitionDemo);

        return () => {
            window.removeEventListener('openFaceRecognitionDemo', handleOpenFaceRecognitionDemo);
        };
    }, []);

    const toggleDemo = (demoType = '') => {
        setActiveDemoType(demoType);
        setShowDemo(!showDemo);
    };

    return (
        <div className="models-page">
            <section id="home">
                <Hero toggleDemo={toggleDemo} />
            </section>

            <AnimatePresence>
                {showDemo && (
                    <motion.section
                        id="demo"
                        className="demo-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            background: 'rgba(0,0,0,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div className="demo-container" style={{ width: '100%', maxWidth: '1200px', padding: '2rem' }}>
                            <button
                                className="close-demo"
                                onClick={() => toggleDemo()}
                                style={{
                                    position: 'absolute',
                                    top: '2rem',
                                    right: '2rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                            <Demo activeDemoType={activeDemoType} />
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ModelsPage;
