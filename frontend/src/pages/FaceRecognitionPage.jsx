import { useState, useRef } from 'react';
import CameraFeed from '../components/CameraFeed';
import CaptureController from '../components/CaptureController';
import Footer from '../components/layout/Footer';
// Sidebar removed

const FaceRecognitionPage = () => {
  const videoRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognizedName, setRecognizedName] = useState(null);
  const [error, setError] = useState(null);
  // State removed

  const handleCapture = (imageSrc) => {
    setCapturedImage(imageSrc);
    setError(null);
    // Reset recognized name when capturing a new image
    setRecognizedName(null);
  };

  const handleResult = (result) => {
    // Handle the specific API response structure:
    // { "faces_detected": 1, "results": [{ "identity": "sagar", "confidence": 0.575, "bbox": [...] }] }
    if (result && result.results && Array.isArray(result.results) && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult && firstResult.identity) {
        setRecognizedName(firstResult.identity);
      } else {
        setRecognizedName("Unknown");
      }
    } else {
      // Fallback to the previous logic if the expected structure isn't found
      if (result && result.name) {
        setRecognizedName(result.name);
      } else {
        setRecognizedName("Unknown");
      }
    }
    setError(null);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setRecognizedName(null);
  };

  return (
    <div className="app">
      {/* Sidebar removed */}

      <main>
        <div className="face-recognition-page" style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <h1 style={{
            fontSize: '28px',
            marginBottom: '24px',
            textAlign: 'center',
            color: '#1f2937'
          }}>
            Face Recognition
          </h1>

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
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          {recognizedName && (
            <div className="success-container" style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
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
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{recognizedName}</div>
            </div>
          )}

          {capturedImage && (
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
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default FaceRecognitionPage;