import { useState, useRef, useEffect } from 'react';
import CameraFeed from '../../components/CameraFeed';
import CaptureController from '../../components/CaptureController';
import { motion } from 'framer-motion';

const FaceRecognitionDemo = () => {
  const videoRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("FaceRecognitionDemo mounted");
    
    return () => {
      console.log("FaceRecognitionDemo unmounted");
      // Cleanup on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          console.log("Stopping track:", track.kind);
          track.stop();
        });
      }
    };
  }, []);

  const handleCapture = (imageSrc, info) => {
    setCapturedImage(imageSrc);
    if (info) {
      setImageInfo(info);
    }
    setError(null);
  };

  const handleResult = (result, info) => {
    // Extract just the name from the API response
    let recognizedName = "Unknown";
    
    // Handle the specific API response structure:
    // { "faces_detected": 1, "results": [{ "identity": "sagar", "confidence": 0.575, "bbox": [...] }] }
    if (result && result.results && Array.isArray(result.results) && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult && firstResult.identity) {
        recognizedName = firstResult.identity;
      }
    } else if (result && result.name) {
      recognizedName = result.name;
    }
    
    // Store the entire result but we'll only display the name
    setRecognitionResult({...result, extractedName: recognizedName});
    
    if (info && !imageInfo) {
      setImageInfo(info);
    }
    setError(null);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setRecognitionResult(null);
  };

  return (
    <div className="model-page">
      <section className="model-hero">
        <div className="container" style={{ maxWidth: 'none' }}>
          <motion.div
            className="model-hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="model-badge">Interactive Demo</div>
            <h1 className="model-hero-title">Face Recognition Demo</h1>
            <p className="model-hero-subtitle">
              Try out the face recognition model in real-time
            </p>
          </motion.div>
        </div>
      </section>

      <section className="demo-section">
        <div className="container" style={{ maxWidth: 'none' }}>
          <motion.div
            className="demo-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ maxWidth: 'none', margin: '0 auto', padding: '24px' }}
          >
            <div className="camera-section" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <CameraFeed videoRef={videoRef} onError={handleError} />
              
              <CaptureController
                videoRef={videoRef}
                onCapture={handleCapture}
                onResult={handleResult}
                onError={handleError}
              />
            </div>

            {error && (
              <div className="error-container" style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {capturedImage && !recognitionResult && (
              <div className="result-section" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  color: '#1f2937'
                }}>
                  Captured Image
                </h2>
                <img
                  src={capturedImage}
                  alt="Captured"
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                
                {imageInfo && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Image Information</h3>
                    <p><strong>Type:</strong> {imageInfo.type}</p>
                    <p><strong>Size:</strong> {imageInfo.size}</p>
                    <p><strong>Captured at:</strong> {imageInfo.lastModified}</p>
                  </div>
                )}
              </div>
            )}

            {capturedImage && recognitionResult && (
              <div className="captured-image-container" style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  marginBottom: '16px',
                  color: '#1f2937'
                }}>
                  Captured Image
                </h2>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </div>
              </div>
            )}

            {recognitionResult && (
              <div className="success-container" style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(22, 101, 52, 0.1)'
              }}>
                <div style={{ marginBottom: '4px' }}>Recognized:</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>
                  {recognitionResult.extractedName}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default FaceRecognitionDemo;