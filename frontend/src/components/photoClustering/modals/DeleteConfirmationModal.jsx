import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Delete Confirmation Modal Component
 * Displays a confirmation dialog before deleting a folder
 */
const DeleteConfirmationModal = ({ isOpen, folderName, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <motion.div 
          className="modal-content"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '1.75rem',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)'
          }}
        >
          <h3 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            color: '#DC2626',
            fontWeight: '600'
          }}>
            Delete Folder?
          </h3>
          
          <p style={{ 
            marginBottom: '1.5rem',
            color: '#4B5563'
          }}>
            Are you sure you want to delete the folder "{folderName}"? This action cannot be undone and all photos in this folder will be permanently deleted.
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
            <button 
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#374151',
                fontWeight: 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#E5E7EB';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
            >
              Cancel
            </button>
            
            <button 
              onClick={onConfirm}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#DC2626',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#B91C1C';
                e.currentTarget.style.boxShadow = '0 6px 15px rgba(220, 38, 38, 0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#DC2626';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(220, 38, 38, 0.2)';
              }}
            >
              Delete Permanently
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteConfirmationModal;