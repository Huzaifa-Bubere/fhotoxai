import { API_BASE_URL } from '../services/api';

export { API_BASE_URL };

/**
 * Checks if the API is running by pinging the root endpoint
 * @returns {Promise<boolean>} True if API is running, false otherwise
 */
export const checkApiStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      // Set a short timeout to avoid long waiting if API is down
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (error) {
    console.warn("API health check failed:", error);
    return false;
  }
};


/**
 * Sends an image to the face recognition API
 * @param {Blob} imageBlob - The image file to process
 * @returns {Promise<Object>} Recognition results
 */
export const recognizeFace = async (imageBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob);

    const AI_API_URL = import.meta.env.VITE_AI_API_URL?.replace(/\/+$/, '') || '/ai-api';
    const response = await fetch(`${AI_API_URL}/processing/recognize`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Face recognition API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Face recognition API error:", error);
    throw error;
  }
};
