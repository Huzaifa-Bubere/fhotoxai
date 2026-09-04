import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AILoader.css';

const AILoader = ({
    active = true,
    text = "Loading",
    subtext = "Please wait...",
    fullScreen = true
}) => {
    if (!active) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={fullScreen ? "ai-loader-overlay" : "ai-loader-inline"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div className="ai-loader-rings">
                    <div className="spinner-ring" />
                </div>

                <div className="loader-text-container">
                    <div className="loader-title">
                        {text}
                    </div>
                    {subtext && (
                        <div className="loader-subtitle">
                            {subtext}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AILoader;
