import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEvents } from '../utils/eventService';

const LoginPopup = ({ isOpen, onClose, onSubmit }) => {
  // Form state
  const [formData, setFormData] = useState({
    event: '',
    role: '',
    name: '',
    password: ''
  });
  
  // Events state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Fetch events when the popup is opened
  useEffect(() => {
    if (isOpen) {
      setLoadingEvents(true);
      getEvents()
        .then(data => {
          setEvents(data);
          setLoadingEvents(false);
        })
        .catch(error => {
          console.error('Error fetching events:', error);
          setLoadingEvents(false);
        });
    }
  }, [isOpen]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.event) newErrors.event = 'Please select an event';
    if (!formData.role) newErrors.role = 'Please select your role';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Find the selected event object
    const selectedEvent = events.find(event => event.id.toString() === formData.event.toString());
    
    // Submit the form data with the full event object
    onSubmit({
      ...formData,
      eventObject: selectedEvent
    });
    
    // Clear form data
    setFormData({
      event: '',
      role: '',
      name: '',
      password: ''
    });
  };
  
  // Define animation variants for the modal
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.1 } }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
          }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content"
            variants={modalVariants}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '24px',
              color: '#1f2937',
              textAlign: 'center'
            }}>
              Login to Upload Photos
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="event" 
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#4b5563'
                  }}
                >
                  Event Name
                </label>
                <select
                  id="event"
                  name="event"
                  value={formData.event}
                  onChange={handleChange}
                  disabled={loadingEvents}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: errors.event ? '1px solid #ef4444' : '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border 0.3s',
                    backgroundColor: '#f9fafb',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%236B7280' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <option value="" disabled>
                    {loadingEvents ? 'Loading events...' : 'Select an event'}
                  </option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                {errors.event && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.event}
                  </p>
                )}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="role" 
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#4b5563'
                  }}
                >
                  Your Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: errors.role ? '1px solid #ef4444' : '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border 0.3s',
                    backgroundColor: '#f9fafb',
                    appearance: 'none'
                  }}
                >
                  <option value="" disabled>Select your role</option>
                  <option value="photographer">Photographer</option>
                  <option value="organizer">Event Organizer</option>
                  <option value="participant">Participant</option>
                  <option value="other">Other</option>
                </select>
                {errors.role && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.role}
                  </p>
                )}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="name" 
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#4b5563'
                  }}
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: errors.name ? '1px solid #ef4444' : '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border 0.3s',
                    backgroundColor: '#f9fafb'
                  }}
                />
                {errors.name && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.name}
                  </p>
                )}
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label 
                  htmlFor="password" 
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#4b5563'
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: errors.password ? '1px solid #ef4444' : '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border 0.3s',
                    backgroundColor: '#f9fafb'
                  }}
                />
                {errors.password && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.password}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#6366F1',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Login & Upload
                </button>
                
                <p style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center', marginTop: '8px' }}>
                  Your login information helps us securely organize event photos.
                </p>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginPopup;