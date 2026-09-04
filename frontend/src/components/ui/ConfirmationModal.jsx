import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import './ConfirmationModal.css';

const ICONS = {
    danger: AlertTriangle,
    warning: AlertCircle,
    info: Info
};

/**
 * Reusable Confirmation Modal
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to close the modal (cancel)
 * @param {function} onConfirm - Function to execute on confirmation
 * @param {string} title - Modal title
 * @param {string} message - Modal message body
 * @param {string} type - 'danger' | 'warning' | 'info' (Affects styling)
 * @param {string} confirmText - Text for the confirm button
 * @param {string} cancelText - Text for the cancel button
 * @param {boolean} isLoading - Whether the confirm action is processing
 */
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const Icon = ICONS[type] || ICONS.info;

    return (
        <div className="confirmation-modal-overlay">
            <div className="confirmation-modal-container">
                <div className="confirmation-modal-header">
                    <div className={`confirmation-icon-wrapper ${type}`}>
                        <Icon size={24} />
                    </div>
                    <div className="confirmation-text-content">
                        <h3>{title}</h3>
                        <p>{message}</p>
                    </div>
                </div>

                <div className="confirmation-modal-footer">
                    <button
                        className="modal-btn cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`modal-btn confirm ${type}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
