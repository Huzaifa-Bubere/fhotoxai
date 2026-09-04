import { useState, useEffect, useRef } from 'react';

const CameraFeed = ({ videoRef, onError }) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    // Set the ref to the actual DOM element instead of creating a detached element
    videoRef.current = localVideoRef.current;
    
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err => {
              if (onError) {
                onError("Video playback failed");
              }
            });
          };
          setPermissionGranted(true);
        }
      } catch (err) {
        setPermissionGranted(false);
        if (onError) {
          onError(err.message || 'Could not access camera');
        }
      }
    };
    
    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [videoRef, onError]);
  
  return (
    <div className="camera-container">
      {!permissionGranted && (
        <div className="camera-permission-error">
          <p>Camera access needed</p>
          <p>Please allow camera access to use face recognition</p>
        </div>
      )}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '16px',
          display: permissionGranted ? 'block' : 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backgroundColor: '#f3f4f6'
        }}
      />
      {/* Keep canvas for capturing frames, but hidden */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width="1280"
        height="720"
      />
    </div>
  );
};

export default CameraFeed;