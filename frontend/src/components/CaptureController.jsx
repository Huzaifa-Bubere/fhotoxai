import { useState, useRef } from "react";
import { systemAPI } from "../services/api";

const CaptureController = ({ videoRef, onCapture, onResult, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  const captureFrame = async () => {
    if (!videoRef.current || isProcessing) {
      if (onError) onError("Camera not ready. Please try again.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      
      // Create canvas if it doesn't exist in the ref
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL for display
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      
      if (onCapture) {
        onCapture(imageDataUrl);
      }
      
      // Create blob for API submission
      canvas.toBlob(
        async (blob) => {
          try {
            if (!blob) {
              throw new Error("Failed to create image blob");
            }
            
            console.log("Sending blob to API:", blob);
            const result = await systemAPI.recognizeFace(blob);
            
            if (onResult) {
              onResult(result);
            }
          } catch (err) {
            console.error("Face recognition error:", err);
            if (onError) {
              onError(err.message || "Face recognition failed");
            }
          } finally {
            setIsProcessing(false);
          }
        },
        "image/jpeg",
        0.8
      );
    } catch (err) {
      console.error("Frame capture error:", err);
      setIsProcessing(false);
      if (onError) {
        onError(err.message || "Error capturing image");
      }
    }
  };

  return (
    <div className="capture-controls">
      <button
        onClick={captureFrame}
        disabled={isProcessing}
        style={{
          padding: '12px 24px',
          backgroundColor: isProcessing ? '#ccc' : '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
          marginTop: '16px'
        }}
      >
        {isProcessing ? 'Processing...' : 'Recognize Face'}
      </button>
    </div>
  );
};

export default CaptureController;
