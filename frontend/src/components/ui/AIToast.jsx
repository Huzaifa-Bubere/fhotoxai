import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X, Loader2, Cpu } from 'lucide-react';
import './AIToast.css';

const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertTriangle size={20} />,
    info: <Info size={20} />,
    processing: <Loader2 size={20} />, // Will spin via CSS
    neural: <Cpu size={20} />
};

const AIToast = ({ id, message, type = 'info', duration = 4000, onClose }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const getTitle = (t) => {
        switch (t) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            case 'info': return 'Information';
            case 'processing': return 'Processing';
            case 'neural': return 'System';
            default: return 'Notification';
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`ai-toast ${type}`}
        >
            <div className="ai-toast-icon">
                {icons[type] || icons.info}
            </div>

            <div className="ai-toast-content">
                <div className="ai-toast-title">
                    {getTitle(type)}
                </div>
                <div className="ai-toast-message">{message}</div>
            </div>

            <button className="ai-toast-close" onClick={() => onClose(id)} aria-label="Close">
                <X size={14} />
            </button>
        </motion.div>
    );
};

export default AIToast;
