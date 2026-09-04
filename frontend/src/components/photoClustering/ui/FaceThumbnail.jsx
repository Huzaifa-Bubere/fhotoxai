import React, { useState, useEffect, useRef } from 'react';
import { getPhotoUrl } from '../../../utils/photoClusteringApi';
import './FaceThumbnail.css';

/**
 * FaceThumbnail Component
 * 
 * Displays a thumbnail of a detected face by cropping the source image using a Canvas.
 * This ensures that the cropping uses the exact pixel coordinates from the backend,
 * ignoring CSS layout scaling or EXIF rotation mismatches that might occur with <img> tags.
 * 
 * @param {Object} props
 * @param {Object} props.face - Face data object containing bbox and photo_url
 * @param {Function} props.onClick - Optional click handler for the thumbnail
 * @param {Object} props.style - Inline styles
 * @param {string} props.className - CSS class
 */
const FaceThumbnail = ({ face, onClick, style, className }) => {
  const { bbox, photo_url } = face;
  // bbox format: [x, y, width, height]
  const [x, y, width, height] = bbox;
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const canvasRef = useRef(null);

  // Prepare the URL
  const fullPhotoUrl = photo_url?.startsWith('http')
    ? photo_url
    : getPhotoUrl(photo_url, false, face.storage_type);
  const imageError = !!fullPhotoUrl && failedUrl === fullPhotoUrl;
  const loading = !!fullPhotoUrl && loadedUrl !== fullPhotoUrl && failedUrl !== fullPhotoUrl;

  // Draw image to canvas on change
  useEffect(() => {
    let cancelled = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const drawFaceThumbnail = (img) => {
      if (cancelled) return;

      // Set canvas size (e.g. 150x150 for thumbnail quality)
      // Increasing this improves quality on retina displays
      const THUMBNAIL_SIZE = 300;
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      if (naturalWidth && naturalHeight && width > 0) {
        // Add padding (expand bbox)
        const padding = 0.2; // 20%

        let cropX = x - (width * padding);
        let cropY = y - (height * padding);
        let cropW = width * (1 + padding * 2);
        let cropH = height * (1 + padding * 2);

        // Ensure square crop for consistency in grid (optional, but looks better)
        // We take the max dimension to ensure we don't cut off chin/hair
        const maxDim = Math.max(cropW, cropH);

        // Center the square around the face center
        const centerX = cropX + cropW / 2;
        const centerY = cropY + cropH / 2;

        cropX = centerX - maxDim / 2;
        cropY = centerY - maxDim / 2;
        cropW = maxDim;
        cropH = maxDim;

        // Draw to canvas
        // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height); // White background

        try {
          // Note: If source coordinates are out of bounds, browsers usually handle it or clip.
          ctx.drawImage(
            img,
            cropX, cropY, cropW, cropH,
            0, 0, canvas.width, canvas.height
          );
        } catch (err) {
          console.warn('Canvas draw error:', err);
          // Fallback: draw full image if crop fails
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

      } else {
        // Fallback: draw full image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      setFailedUrl('');
      setLoadedUrl(fullPhotoUrl);
    };

    const loadImage = (url, useCors) => new Promise((resolve, reject) => {
      const img = new Image();
      if (useCors) {
        img.crossOrigin = 'Anonymous';
      }

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });

    const candidateUrls = [
      fullPhotoUrl,
      !photo_url?.startsWith('http') && face.storage_type === 's3'
        ? getPhotoUrl(photo_url, true, face.storage_type)
        : null,
      fullPhotoUrl.includes('http://localhost')
        ? fullPhotoUrl.replace(/http:\/\/localhost:[0-9]+/, '')
        : null
    ].filter(Boolean).filter((url, index, urls) => urls.indexOf(url) === index);

    (async () => {
      for (const url of candidateUrls) {
        for (const useCors of [true, false]) {
          try {
            const img = await loadImage(url, useCors);
            if (cancelled) return;
            drawFaceThumbnail(img);
            return;
          } catch {
            continue;
          }
        }
      }

      if (!cancelled) {
        setFailedUrl(fullPhotoUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [face.id, face.storage_type, bbox, fullPhotoUrl, height, photo_url, width, x, y]);

  return (
    <div
      className={`face-thumbnail ${className || ''}`}
      style={{
        ...style,
        position: 'relative',
        backgroundColor: '#f0f0f0',
        overflow: 'hidden'
      }}
      onClick={onClick ? () => onClick(face) : undefined}
      title={`Confidence: ${Math.round((face.confidence || 0) * 100)}%`}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowDebug(!showDebug);
      }}
    >
      <div className="face-container" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
        {loading && (
          <div className="face-loading" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, background: '#f9f9f9'
          }}>
            <small style={{ fontSize: '0.6rem', color: '#999' }}>...</small>
          </div>
        )}

        {!imageError ? (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <div className="face-error" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 2
          }}>
            <span>⚠️</span>
          </div>
        )}

        {showDebug && (
          <div className="face-debug" style={{
            position: 'absolute', bottom: 0, left: 0,
            background: 'rgba(0,0,0,0.8)', color: '#fff',
            fontSize: '8px', padding: '2px', zIndex: 10,
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            {Math.round(width)}x{Math.round(height)} {face.storage_type ? `| ${face.storage_type}` : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceThumbnail;
