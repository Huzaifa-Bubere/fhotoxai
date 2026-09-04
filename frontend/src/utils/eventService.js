/**
 * Event data service for the Event Management Company application
 * This module provides functions to fetch and manage event data
 */

// Sample events - in a real application, these would come from the database
const sampleEvents = [
  { id: 1, name: 'TCS Annual Conference 2026', location: 'Mumbai Convention Center', date: '2026-03-15' },
  { id: 2, name: 'Wipro Tech Summit', location: 'Bangalore Tech Park', date: '2026-04-22' },
  { id: 3, name: 'DNA Group Networking Event', location: 'Delhi Business Center', date: '2026-02-10' },
  { id: 4, name: 'Synechron Financial Innovation Forum', location: 'Pune Financial District', date: '2026-05-18' },
  { id: 5, name: 'TechMahindra Developer Conference', location: 'Hyderabad Convention Hall', date: '2026-06-05' },
  { id: 6, name: 'Infosys Sustainability Summit', location: 'Mysore Campus', date: '2026-07-12' },
  { id: 7, name: 'HCL AI Symposium', location: 'Noida Tech Hub', date: '2026-08-20' },
  { id: 8, name: 'Cognizant Digital Transformation Workshop', location: 'Chennai IT Park', date: '2026-09-15' }
];

/**
 * Get all available events
 * @returns {Promise<Array>} Array of event objects
 */
export const getEvents = () => {
  return new Promise((resolve) => {
    // Simulate API call delay
    setTimeout(() => {
      resolve(sampleEvents);
    }, 300);
  });
};

/**
 * Get event by ID
 * @param {number} id Event ID
 * @returns {Promise<Object>} Event object
 */
export const getEventById = (id) => {
  return new Promise((resolve, reject) => {
    const event = sampleEvents.find(e => e.id === parseInt(id, 10));
    if (event) {
      resolve(event);
    } else {
      reject(new Error(`Event with ID ${id} not found`));
    }
  });
};

/**
 * Format event date for display
 * @param {string} dateString ISO date string
 * @returns {string} Formatted date
 */
export const formatEventDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default {
  getEvents,
  getEventById,
  formatEventDate
};