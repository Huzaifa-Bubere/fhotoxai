import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Download, PackageOpen, ChevronDown, FileText, FileCode2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

// Helper function to convert a Blob to Base64 (needed for standalone HTML inside img tags)
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const generateCoverCanvasBase64 = (title, count) => {
    const canvas = document.createElement('canvas');
    const canvasWidth = 1260; // 210 * 6
    const canvasHeight = 1782; // 297 * 6
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText(title, canvasWidth / 2, canvasHeight / 2 - 50);
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(canvasWidth / 2 - 200, canvasHeight / 2 + 50, 400, 4);
    
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText(`${count} MEMORIES`, canvasWidth / 2, canvasHeight / 2 + 150);
    
    return canvas.toDataURL('image/jpeg', 0.8);
};

const generatePDFCanvasBase64 = (img, imgWidth, imgHeight, isCover) => {
    const canvas = document.createElement('canvas');
    const isLandscape = imgWidth > imgHeight;
    const canvasWidth = isLandscape ? 1782 : 1260;
    const canvasHeight = isLandscape ? 1260 : 1782;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Fill dark background like the webpage
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (isCover) {
        // Landscape (cover)
        const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;
        const drawX = (canvasWidth - drawW) / 2;
        const drawY = (canvasHeight - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
        // Portrait (contain with ambient blur)
        ctx.save();
        ctx.filter = 'blur(40px) brightness(60%) saturate(120%)';
        const bgScale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight) * 1.1;
        const bgW = imgWidth * bgScale;
        const bgH = imgHeight * bgScale;
        ctx.drawImage(img, (canvasWidth - bgW) / 2, (canvasHeight - bgH) / 2, bgW, bgH);
        ctx.restore();
        
        // Draw crisp image
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;
        const drawX = (canvasWidth - drawW) / 2;
        const drawY = (canvasHeight - drawH) / 2;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.fillRect(drawX, drawY, drawW, drawH); 
        ctx.restore();
        
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    
    // Compress heavily to keep PDF small
    return {
        base64: canvas.toDataURL('image/jpeg', 0.6),
        isLandscape
    };
};

// ... (Helper function to generate offline vanilla HTML flipbook)
const generateOfflineFlipbookHTML = (photoData, eventName) => {
    const title = eventName || 'Photo Flipbook';
    
    // Generate page HTML strings
    let pagesHtml = '';
    
    // Cover Page
    pagesHtml += `
    <div class="page page-cover page-cover-top">
        <div class="page-content">
            <h2 style="font-size: 3rem; color: #fff; margin-bottom: 1rem; width: 100%; word-wrap: break-word;">${title}</h2>
            <div style="width: 100%; height: 2px; background: rgba(255,255,255,0.2); margin-bottom: 2rem;"></div>
            <p style="text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5);">${photoData.length} Memories</p>
        </div>
    </div>
    <div class="page">
        <div class="page-content" style="background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
            <h2>Open to begin</h2>
        </div>
    </div>`;

    // Photo Pages using embedded base64
    photoData.forEach((data) => {
        pagesHtml += `
        <div class="page">
            <div class="page-content photo-page">
                <div class="ambient-bg" style="background-image: url('${data.base64}')"></div>
                <img src="${data.base64}" alt="Photo" class="photo-img" />
            </div>
        </div>`;
    });

    // Back Cover
    pagesHtml += `
    <div class="page page-cover page-cover-bottom">
        <div class="page-content">
            <h2>The End</h2>
        </div>
    </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #0F172A;
            background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1.5px, transparent 1.5px);
            background-size: 32px 32px;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }

        .flipbook-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100vh;
            padding: 40px;
            box-sizing: border-box;
        }

        .flip-book {
            box-shadow: 0 0 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
            border-radius: 4px;
        }

        .page {
            background-color: #fff;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.2) inset;
        }

        .page-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
        }

        .page-cover {
            background-color: #1E293B;
            background-image: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
            color: #fff;
            border-left: solid 1px rgba(255, 255, 255, 0.1);
            border-right: solid 1px rgba(0, 0, 0, 0.5);
        }

        .page-cover.page-cover-top { border-radius: 6px 4px 4px 6px; }
        .page-cover.page-cover-bottom { border-radius: 4px 6px 6px 4px; }
        
        .page-cover .page-content {
             padding: 40px;
             box-sizing: border-box;
        }

        .photo-page {
            background: #000;
        }

        .ambient-bg {
            position: absolute;
            inset: -40px;
            z-index: 1;
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
            filter: blur(30px) brightness(0.6) saturate(1.2);
            transform: scale(1.1);
        }

        .photo-img {
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain;
            filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));
        }

        /* Center spine shading */
        .page-content::after {
            content: '';
            position: absolute;
            top: 0; bottom: 0;
            width: 40px;
            z-index: 10;
            pointer-events: none;
        }
        .--left .page-content::after {
            right: 0;
            background: linear-gradient(to right, transparent, rgba(0,0,0,0.4));
        }
        .--right .page-content::after {
            left: 0;
            background: linear-gradient(to left, transparent, rgba(0,0,0,0.4));
        }

    </style>
</head>
<body>
    <div class="flipbook-container">
        <div id="flipbook" class="flip-book">
            ${pagesHtml}
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const flipBook = new St.PageFlip(
                document.getElementById('flipbook'),
                {
                    width: 500,
                    height: 650,
                    size: 'stretch',
                    minWidth: 315,
                    maxWidth: 600,
                    minHeight: 420,
                    maxHeight: 780,
                    showCover: true,
                    maxShadowOpacity: 0.5,
                    mobileScrollSupport: false,
                    drawShadow: true,
                }
            );
            
            flipBook.loadFromHTML(document.querySelectorAll('.page'));
        });
    </script>
</body>
</html>`;
};

/* ─── Page Component (forwardRef required by react-pageflip) ─── */
const Page = forwardRef(({ photo, index, total, type, eventName }, ref) => {

    /* Cover */
    if (type === 'cover') {
        return (
            <div ref={ref} style={{ width: '100%', height: '100%', background: 'transparent' }}>
                <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #020617 100%)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)',
                        textAlign: 'center', margin: 0, letterSpacing: '-0.01em',
                        lineHeight: '1.5', width: '100%',
                    }}>Your Moments in<br /><span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: '800' }}>{eventName || 'This Event'}</span></h1>
                </div>
            </div>
        );
    }

    /* Back Cover or Missing Photo string fallback */
    const photoUrl = photo ? (typeof photo === 'string' ? photo : (photo.photo_url || photo.url)) : null;

    if (type === 'back' || (!photoUrl && type === 'photo')) {
        return (
            <div ref={ref} style={{ width: '100%', height: '100%', background: 'transparent' }}>
                <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #020617 0%, #1E293B 50%, #0F172A 100%)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)', fontWeight: '600', marginBottom: '0.5rem',
                    }}>The End</div>
                    <h2 style={{
                        fontSize: '1.2rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)',
                        margin: 0,
                    }}>Thank You</h2>
                </div>
            </div>
        );
    }

    // Photo object logic (smart crop with bbox)
    const bbox = photo?.bbox; 
    let objectPosition = 'center center';
    let [imgWidth, imgHeight] = [0, 0];
    
    if (bbox && bbox.length === 4 && typeof photo !== 'string') {
        const [x, y, w, h] = bbox;
        if (w > 0) {
            const faceCenterX = x + (w / 2);
            const faceCenterY = y + (h / 2);
            
            if (w <= 1 && h <= 1) {
                 const posX = Math.max(0, Math.min(100, faceCenterX * 100));
                 // Bias slightly above exact center to include hair/top of head comfortably
                 const posY = Math.max(0, Math.min(100, Math.max(0, faceCenterY * 100 - 10)));
                 objectPosition = `${posX}% ${posY}%`;
            } 
        }
    }
    
    // Attempt to read explicit dimensions if provided by API
    if (photo && typeof photo !== 'string' && photo.photo_width && photo.photo_height) {
        imgWidth = photo.photo_width;
        imgHeight = photo.photo_height;
    }

    // Determine strategy: If tall (portrait/square) use contain with blur background. If wide (landscape), use cover.
    // Fallback to contain if we don't know dimensions, to be safe.
    const isLandscape = imgWidth > imgHeight;
    const objectFitMode = (imgWidth && imgHeight) ? (isLandscape ? 'cover' : 'contain') : 'contain';

    /* Photo Page — edge-to-edge */
    return (
        <div ref={ref} style={{
            width: '100%', height: '100%',
            background: '#0a0a0a',
            position: 'relative', overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 20px rgba(0,0,0,0.5)',
        }}>
            {/* Subtle inner shadow overlay for depth */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.6) 100%)',
            }} />
            
            {/* Ambient Blurred Background (visible mostly for 'contain' tall photos) */}
            <div style={{
                position: 'absolute', inset: -40, zIndex: 1, // Slightly oversized to hide blur edges
                background: `url(${photoUrl}) center/cover no-repeat`,
                filter: 'blur(30px) brightness(0.6) saturate(1.2)',
                transform: 'scale(1.1)', // help hide hard edges
            }} />
            
            <img
                src={photoUrl}
                alt={`Photo ${index + 1}`}
                style={{
                    position: 'relative', zIndex: 2,
                    width: '100%', height: '100%',
                    objectFit: objectFitMode,
                    objectPosition: objectPosition,
                    display: 'block',
                    boxShadow: objectFitMode === 'contain' ? '0 0 40px rgba(0,0,0,0.5)' : 'none',
                }}
                onLoad={(e) => {
                    // Fallback evaluation if photo dimensions weren't strictly provided by API
                    if (!imgWidth || !imgHeight) {
                        const { naturalWidth, naturalHeight } = e.target;
                        if (naturalHeight >= naturalWidth) {
                            e.target.style.objectFit = 'contain';
                            e.target.style.boxShadow = '0 0 40px rgba(0,0,0,0.5)';
                        } else {
                            e.target.style.objectFit = 'cover';
                            e.target.style.boxShadow = 'none';
                        }
                    }
                }}
            />
            {/* Subtle page number at bottom */}
            <div style={{
                position: 'absolute', bottom: '0.8rem', right: '1rem', zIndex: 10,
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)',
                fontWeight: '600', letterSpacing: '0.08em',
                textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                background: 'rgba(0,0,0,0.3)', padding: '4px 8px',
                borderRadius: '4px', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {index + 1} / {total}
            </div>
        </div>
    );
});

Page.displayName = 'Page';

/* ─── Main Flipbook Manager ─── */
const FlipbookManager = ({ initialPhotos = [], onClose, backLabel = "Back", eventName = "" }) => {
    const [photos, setPhotos] = useState([]);
    const bookRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 500, height: 400 });
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState(null); // 'html' or 'pdf'
    const [showExportMenu, setShowExportMenu] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const filtered = initialPhotos.filter(p => !!p);
        setPhotos(filtered);
        setTotalPages(filtered.length + 2);
    }, [initialPhotos]);

    /* Calculate landscape book size to fill screen */
    useEffect(() => {
        const calc = () => {
            const topBar = 48;
            const bottomBar = 40;
            const vPad = 20;
            const hPad = 140; // room for nav arrows

            const availH = window.innerHeight - topBar - bottomBar - vPad;
            const availW = window.innerWidth - hPad;

            // Landscape: each page is wider than tall (4:3 per page)
            // The book shows one page at a time in portrait mode
            // We want landscape ratio ~4:3 per single page
            const pageRatio = 4 / 3; // width / height
            let pageH = availH;
            let pageW = pageH * pageRatio;

            // If the single page is too wide for half the screen, constrain
            if (pageW > availW / 1.2) {
                pageW = availW / 1.2;
                pageH = pageW / pageRatio;
            }

            pageW = Math.max(300, Math.min(pageW, 900));
            pageH = Math.max(220, Math.min(pageH, 700));

            setDimensions({ width: Math.round(pageW), height: Math.round(pageH) });
        };

        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);

    const onFlip = useCallback((e) => setCurrentPage(e.data), []);
    const onInit = useCallback(() => setIsReady(true), []);
    const goNext = () => bookRef.current?.pageFlip()?.flipNext();
    const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();

    /* Keyboard */
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const progress = totalPages > 1 ? currentPage / (totalPages - 1) : 0;

    // Helper to safely fetch images avoiding CORS blocks on S3/Cloudfront
    const fetchImageSafe = async (imageUrl) => {
        // Bypass browser cache which may have stored the image without CORS headers from a standard <img> tag
        const cacheBustedUrl = imageUrl.includes('?') 
            ? `${imageUrl}&cors_t=${Date.now()}` 
            : `${imageUrl}?cors_t=${Date.now()}`;
            
        try {
            const res = await fetch(cacheBustedUrl, { mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.blob();
        } catch (e) {
            console.warn('Direct fetch failed (likely CORS), trying primary proxy for:', imageUrl);
            try {
                // Primary proxy
                const proxyUrl1 = `https://corsproxy.io/?url=${encodeURIComponent(imageUrl)}`;
                const res1 = await fetch(proxyUrl1);
                if (!res1.ok) throw new Error(`Proxy 1 HTTP error! status: ${res1.status}`);
                return await res1.blob();
            } catch (e2) {
                console.warn('Primary proxy failed, trying secondary proxy for:', imageUrl);
                // Secondary proxy
                const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
                const res2 = await fetch(proxyUrl2);
                if (!res2.ok) throw new Error(`Proxy 2 HTTP error! status: ${res2.status}`);
                return await res2.blob();
            }
        }
    };



    const fetchAllPhotosAsBlobs = async () => {
        const blobsData = [];
        
        // Fetch sequentially to avoid rate-limiting from free public proxies
        for (let index = 0; index < photos.length; index++) {
            const photo = photos[index];
            const url = typeof photo === 'string' ? photo : (photo.photo_url || photo.url);
            if (!url) continue;
            
            try {
                const blob = await fetchImageSafe(url);
                // Get natural dimensions from image to know if it's landscape/portrait for PDF
                const img = new Image();
                img.src = window.URL.createObjectURL(blob);
                await new Promise(resolve => { img.onload = resolve; });
                
                blobsData.push({
                    blob,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    index
                });
                
                window.URL.revokeObjectURL(img.src);
                
                // Small delay to be polite to proxies
                await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                console.error(`Failed to fetch photo ${index + 1}:`, e);
            }
        }

        return blobsData;
    };

    const handleExportHTML = async () => {
        if (isExporting || photos.length === 0) return;
        setIsExporting(true);
        setExportFormat('html');
        setShowExportMenu(false);

        try {
            const baseName = eventName ? `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : 'flipbook';
            
            const blobsData = await fetchAllPhotosAsBlobs();
            if (blobsData.length === 0) throw new Error("No images could be downloaded.");

            // Convert to base64
            const photoData = [];
            for (const item of blobsData) {
                const base64 = await blobToBase64(item.blob);
                photoData.push({ base64 });
            }
            
            // Generate and inject offline HTML index
            const offlineHtml = generateOfflineFlipbookHTML(photoData, eventName);
            const blob = new Blob([offlineHtml], { type: "text/html;charset=utf-8" });
            saveAs(blob, `${baseName}_interactive.html`);
            
        } catch (error) {
            console.error('Error creating HTML export:', error);
            alert('Failed to generate interactive HTML. Please try downloading individual photos.');
        } finally {
            setIsExporting(false);
            setExportFormat(null);
        }
    };

    const handleExportPDF = async () => {
        if (isExporting || photos.length === 0) return;
        setIsExporting(true);
        setExportFormat('pdf');
        setShowExportMenu(false);

        try {
            const baseName = eventName ? `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : 'album';
            
            const blobsData = await fetchAllPhotosAsBlobs();
            if (blobsData.length === 0) throw new Error("No images could be downloaded.");

            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            
            // Generate Cover Page to match UI
            const coverBase64 = generateCoverCanvasBase64(eventName || 'Photo Album', blobsData.length);
            pdf.addImage(coverBase64, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            
            for (let i = 0; i < blobsData.length; i++) {
                const item = blobsData[i];
                
                // Create temp image to draw on canvas
                const img = new Image();
                img.src = window.URL.createObjectURL(item.blob);
                await new Promise(resolve => { img.onload = resolve; });
                
                // If width > height, use 'cover' logic, else use 'contain' with blur logic
                const shouldCover = item.width > item.height;
                
                const { base64, isLandscape } = generatePDFCanvasBase64(img, item.width, item.height, shouldCover);
                window.URL.revokeObjectURL(img.src);
                
                const pdfOrientation = isLandscape ? 'l' : 'p';
                const pageWidth = isLandscape ? 297 : 210;
                const pageHeight = isLandscape ? 210 : 297;
                
                pdf.addPage('a4', pdfOrientation);
                // Canvas is exactly identical ratio to A4 (1920x1080 / 1080x1920 matches perfectly)
                pdf.addImage(base64, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            }
            
            pdf.save(`${baseName}_photos.pdf`);
            
        } catch (error) {
            console.error('Error creating PDF export:', error);
            alert('Failed to generate PDF album. Please try downloading individual photos.');
        } finally {
            setIsExporting(false);
            setExportFormat(null);
        }
    };

    /* Loading */
    if (photos.length === 0) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Loader2 size={36} color="#6366F1" style={{ animation: 'flipbook-spin 1.5s linear infinite' }} />
                    <p style={{ color: '#94A3B8', marginTop: '1rem', fontSize: '0.9rem' }}>Loading your moments…</p>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: '#020617', // Deeper base background
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter", -apple-system, sans-serif',
            color: 'white', overflow: 'hidden',
        }}>
            
            {/* Cinematic background ambiance */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 60%)',
                opacity: 0.8,
            }} />

            {/* ═══ Minimal top bar ═══ */}
            <div style={{
                height: '48px', flexShrink: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 1.25rem',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                zIndex: 10,
            }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            fontSize: '0.82rem', fontWeight: '600',
                            padding: '0.35rem 0.8rem', borderRadius: '6px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    >
                        <ArrowLeft size={15} /> {backLabel}
                    </button>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
                    <span style={{
                        fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                        fontWeight: '500', fontVariantNumeric: 'tabular-nums',
                    }}>
                        {currentPage + 1} / {totalPages}
                    </span>
                    <div style={{
                        width: '100px', height: '2px', borderRadius: '1px',
                        background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progress * 100}%`, height: '100%',
                            background: 'linear-gradient(90deg, #6366F1, #818CF8)',
                            transition: 'width 0.4s ease',
                            borderRadius: '1px',
                        }} />
                    </div>
                </div>

                {/* Right side actions */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    
                    {/* Export Dropdown Container */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={isExporting || photos.length === 0}
                            style={{
                                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                                color: '#e0e7ff', cursor: isExporting ? 'progress' : 'pointer', padding: '0.35rem 0.6rem 0.35rem 0.8rem', borderRadius: '6px',
                                display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s',
                                fontSize: '0.82rem', fontWeight: '600',
                                opacity: (isExporting || photos.length === 0) ? 0.6 : 1
                            }}
                            onMouseEnter={e => { if (!isExporting && !showExportMenu) { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = '#fff'; } }}
                            onMouseLeave={e => { if (!isExporting && !showExportMenu) { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#e0e7ff'; } }}
                        >
                            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <PackageOpen size={15} />}
                            {isExporting ? `Exporting ${exportFormat?.toUpperCase()}...` : 'Export Album'}
                            <ChevronDown size={14} style={{ marginLeft: '4px', transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>

                        {/* Dropdown Menu */}
                        {showExportMenu && !isExporting && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                background: 'rgba(15,23,42,0.95)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                minWidth: '200px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3)',
                                zIndex: 50,
                                display: 'flex', flexDirection: 'column', gap: '4px'
                            }}>
                                <button
                                    onClick={handleExportPDF}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.6rem 0.75rem', background: 'transparent',
                                        border: 'none', borderRadius: '4px', color: '#f1f5f9',
                                        cursor: 'pointer', textAlign: 'left',
                                        fontSize: '0.85rem', fontWeight: '500', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <FileText size={16} color="#ef4444" />
                                    Export as PDF Album
                                </button>
                                <button
                                    onClick={handleExportHTML}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.6rem 0.75rem', background: 'transparent',
                                        border: 'none', borderRadius: '4px', color: '#f1f5f9',
                                        cursor: 'pointer', textAlign: 'left',
                                        fontSize: '0.85rem', fontWeight: '500', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <FileCode2 size={16} color="#3b82f6" />
                                    Export Interactive HTML
                                </button>
                            </div>
                        )}
                    </div>


                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer', padding: '0.35rem', borderRadius: '4px',
                            display: 'flex', transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ═══ Book area ═══ */}
            <div style={{
                flex: 1, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', zIndex: 1,
            }}>
                {/* Intense dynamic book shadow */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: dimensions.width * 2, height: dimensions.height,
                    background: 'rgba(0,0,0,1)', filter: 'blur(40px)', opacity: 0.6,
                    pointerEvents: 'none', zIndex: -1,
                }} />

                {/* The flipbook */}
                <div style={{
                    filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 20px rgba(99,102,241,0.15))',
                }}>
                    <HTMLFlipBook
                        ref={bookRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        size="fixed"
                        minWidth={300}
                        maxWidth={900}
                        minHeight={220}
                        maxHeight={700}
                        maxShadowOpacity={0.5}
                        showCover={true}
                        mobileScrollSupport={true}
                        onFlip={onFlip}
                        onInit={onInit}
                        drawShadow={true}
                        flippingTime={600}
                        usePortrait={false}
                        startZIndex={0}
                        autoSize={false}
                        clickEventForward={false}
                        useMouseEvents={true}
                        swipeDistance={20}
                        showPageCorners={true}
                        disableFlipByClick={false}
                        className="flipbook-landscape"
                    >
                        <Page type="cover" total={photos.length} eventName={eventName} />
                        {photos.map((photo, idx) => (
                            <Page key={idx} photo={photo} index={idx} total={photos.length} type="photo" />
                        ))}
                        <Page type="back" total={photos.length} eventName={eventName} />
                    </HTMLFlipBook>
                </div>

                {/* Nav: Previous */}
                <button
                    onClick={goPrev}
                    disabled={currentPage === 0}
                    aria-label="Previous page"
                    style={{
                        position: 'absolute', left: 'clamp(1rem, 3vw, 3rem)',
                        top: '50%', transform: 'translateY(-50%)',
                        width: '52px', height: '52px', borderRadius: '50%',
                        background: 'rgba(30,41,59,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        cursor: currentPage === 0 ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        opacity: currentPage === 0 ? 0.2 : 0.8,
                    }}
                    onMouseEnter={e => {
                        if (currentPage !== 0) {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                            e.currentTarget.style.boxShadow = '0 0 25px rgba(99,102,241,0.4)';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = currentPage === 0 ? '0.2' : '0.8';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        e.currentTarget.style.background = 'rgba(30,41,59,0.5)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                    }}
                >
                    <ChevronLeft size={26} strokeWidth={2.5} />
                </button>

                {/* Nav: Next */}
                <button
                    onClick={goNext}
                    disabled={currentPage >= totalPages - 1}
                    aria-label="Next page"
                    style={{
                        position: 'absolute', right: 'clamp(1rem, 3vw, 3rem)',
                        top: '50%', transform: 'translateY(-50%)',
                        width: '52px', height: '52px', borderRadius: '50%',
                        background: 'rgba(30,41,59,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        opacity: currentPage >= totalPages - 1 ? 0.2 : 0.8,
                    }}
                    onMouseEnter={e => {
                        if (currentPage < totalPages - 1) {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                            e.currentTarget.style.boxShadow = '0 0 25px rgba(99,102,241,0.4)';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = currentPage >= totalPages - 1 ? '0.2' : '0.8';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        e.currentTarget.style.background = 'rgba(30,41,59,0.5)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                    }}
                >
                    <ChevronRight size={26} strokeWidth={2.5} />
                </button>
            </div>

            {/* ═══ Bottom: page dots ═══ */}
            <div style={{
                height: '40px', flexShrink: 0,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '5px',
            }}>
                {Array.from({ length: Math.min(totalPages, 24) }).map((_, i) => {
                    const isActive = i === currentPage;
                    return (
                        <div
                            key={i}
                            style={{
                                width: isActive ? '24px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: isActive ? '#818CF8' : 'rgba(255,255,255,0.2)',
                                boxShadow: isActive ? '0 0 10px rgba(99,102,241,0.8)' : 'none',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                            }}
                            onClick={() => bookRef.current?.pageFlip()?.flip(i)}
                        />
                    );
                })}
                {totalPages > 24 && (
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>
                        +{totalPages - 24}
                    </span>
                )}
            </div>

            {/* Hint */}
            <AnimatePresence>
                {isReady && currentPage === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 1.5, duration: 0.6 }}
                        style={{
                            position: 'absolute', bottom: '3.5rem', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(10px)',
                            padding: '0.35rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            pointerEvents: 'none',
                        }}
                    >
                        <ChevronRight size={12} /> Drag or click to flip
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes flipbook-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .flipbook-landscape { margin: 0 auto; }
            `}</style>
        </div>
    );
};

export default FlipbookManager;
