import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Text as KonvaText } from 'react-konva';
import { X, Download, Layout, LayoutGrid, Layers, ArrowLeft, Loader2, BringToFront, SendToBack, Trash2, Maximize, PlusSquare, Square, RectangleHorizontal, RectangleVertical, RotateCcw, Crop, Palette } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import { useToast } from '../../../../context/ToastContext';
import { motion } from 'framer-motion';
import COLLAGE_TEMPLATES from './collageTemplates';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const TOKENS = {
    colors: {
        primary: '#6366F1',
        primaryHover: '#4F46E5',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: '#1E293B',
        textDim: '#64748B',
    }
};

// Mini preview renderer for templates in the sidebar
const TemplatePreview = ({ template, onClick, isActive }) => {
    const previewW = 120;
    const previewH = previewW * (template.height / template.width);
    const sx = previewW / template.width;
    const sy = previewH / template.height;
    
    return (
        <div 
            onClick={onClick}
            style={{
                cursor: 'pointer',
                border: isActive ? `2px solid ${TOKENS.colors.primary}` : '2px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.15s',
                background: 'white',
                boxShadow: isActive ? '0 0 0 2px rgba(99,102,241,0.2)' : 'none',
            }}
        >
            <Stage width={previewW} height={previewH} style={{ display: 'block' }}>
                <Layer>
                    <Rect x={0} y={0} width={previewW} height={previewH} fill="white" />
                    {template.layers.map((layer, i) => {
                        if (layer.type === 'image') {
                            return (
                                <Rect
                                    key={i}
                                    x={layer.x * sx}
                                    y={layer.y * sy}
                                    width={layer.width * sx}
                                    height={layer.height * sy}
                                    fill="#E2E8F0"
                                    stroke="#CBD5E1"
                                    strokeWidth={0.5}
                                    cornerRadius={2}
                                />
                            );
                        }
                        if (layer.type === 'text') {
                            return (
                                <KonvaText
                                    key={i}
                                    x={layer.x * sx}
                                    y={layer.y * sy}
                                    text={layer.text}
                                    fontSize={Math.max(5, (layer.fontSize || 16) * sx)}
                                    fill={layer.fill || '#1E293B'}
                                    fontStyle={layer.fontStyle || 'normal'}
                                />
                            );
                        }
                        return null;
                    })}
                </Layer>
            </Stage>
            <div style={{ padding: '4px 6px', fontSize: '0.65rem', fontWeight: '600', color: TOKENS.colors.text, textAlign: 'center', borderTop: '1px solid #F1F5F9' }}>
                {template.name}
            </div>
        </div>
    );
};

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

const URLImage = ({ imageElem, shapeProps, isSelected, onSelect, onChange }) => {
    const shapeRef = useRef();
    const trRef = useRef();
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        const loadImg = async () => {
            try {
                const blob = await fetchImageSafe(imageElem.url);
                if (!isMounted) return;
                
                objectUrl = window.URL.createObjectURL(blob);
                const img = new window.Image();
                img.src = objectUrl;
                img.onload = () => {
                    if (isMounted) {
                        setImage(img);
                        setIsLoading(false);
                        
                        if (!shapeProps.naturalWidth) {
                            const nW = img.naturalWidth || 1;
                            const nH = img.naturalHeight || 1;
                            const imgRatio = nW / nH;
                            
                            // Use existing slot dimensions as the container bounds
                            const containerW = shapeProps.width || 300;
                            const containerH = shapeProps.height || 300;
                            const containerRatio = containerW / containerH;
                            
                            // Object-fit: contain within the slot
                            let fitW, fitH;
                            if (imgRatio > containerRatio) {
                                fitW = containerW;
                                fitH = containerW / imgRatio;
                            } else {
                                fitH = containerH;
                                fitW = containerH * imgRatio;
                            }
                            
                            // Center within original slot bounds
                            const xOffset = (containerW - fitW) / 2;
                            const yOffset = (containerH - fitH) / 2;
                            
                            onChange({
                                ...shapeProps,
                                naturalWidth: nW,
                                naturalHeight: nH,
                                x: (shapeProps.x || 0) + xOffset,
                                y: (shapeProps.y || 0) + yOffset,
                                width: Math.max(50, fitW),
                                height: Math.max(50, fitH),
                            });
                        }
                    }
                };
            } catch (err) {
                console.error("Failed to load image for canvas:", err);
                if (isMounted) setIsLoading(false);
            }
        };

        loadImg();

        return () => {
            isMounted = false;
            if (objectUrl) {
                window.URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imageElem.url]);

    useEffect(() => {
        if (isSelected && trRef.current && image) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected, image]);

    if (!image) {
        // Return invisible placeholder while loading blob
        return (
            <Rect 
                {...shapeProps} 
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth={2}
                dash={[5, 10]}
            />
        );
    }

    return (
        <React.Fragment>
            <KonvaImage
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                image={image}
                draggable
                onDragEnd={(e) => {
                    onChange({
                        ...shapeProps,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        // Retain original crop ratio via transform
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    keepRatio={false} // Allow free stretching
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20 || newBox.height < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </React.Fragment>
    );
};


const CollageManager = ({ initialPhotos = [], onClose, backLabel = "Back" }) => {
    const [images, setImages] = useState([]);
    const [availablePhotos, setAvailablePhotos] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(0.5); // Dynamic zoom scale for the viewer
    const [gap, setGap] = useState(20);
    const [activeLayoutCols, setActiveLayoutCols] = useState(null);
    const stageRef = useRef(null);
    const containerRef = useRef(null);
    const { addToast } = useToast();

    // Auto layout pure function
    const applyGridLayout = useCallback((cols, gapSize, currentImages) => {
        if (currentImages.length === 0) return currentImages;
        const totalGapX = (cols + 1) * gapSize;
        const widthPerCell = (CANVAS_WIDTH - totalGapX) / cols;
        const rows = Math.ceil(currentImages.length / cols);
        const totalGapY = (rows + 1) * gapSize;
        const heightPerCell = (CANVAS_HEIGHT - totalGapY) / Math.max(rows, 1);

        return currentImages.map((img, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            let drawW = widthPerCell;
            let drawH = heightPerCell;
            
            if (img.naturalWidth && img.naturalHeight) {
                const imgRatio = img.naturalWidth / img.naturalHeight;
                const cellRatio = widthPerCell / heightPerCell;
                if (imgRatio > cellRatio) {
                    drawH = widthPerCell / imgRatio;
                } else {
                    drawW = heightPerCell * imgRatio;
                }
            }

            const xOffset = (widthPerCell - drawW) / 2;
            const yOffset = (heightPerCell - drawH) / 2;

            return {
                ...img,
                x: gapSize + col * (widthPerCell + gapSize) + xOffset,
                y: gapSize + row * (heightPerCell + gapSize) + yOffset,
                width: Math.max(10, drawW),
                height: Math.max(10, drawH),
                rotation: 0
            };
        });
    }, []);

    const handleAutoLayoutSelected = (layoutType) => {
        let cols = 2;
        if (layoutType === 'grid3') cols = 3;
        if (layoutType === 'grid4') cols = 4;
        
        setActiveLayoutCols(cols);
        setImages(prev => applyGridLayout(cols, gap, prev));
        setSelectedId(null);
    };

    // Load initial photos on mount
    useEffect(() => {
        const initialValid = initialPhotos.filter(p => !!p).map(url => ({
            id: uuidv4(),
            url: typeof url === 'string' ? url : (url.photo_url || url.url)
        }));
        setAvailablePhotos(initialValid);
        
        // Start with an empty canvas so the user can select exactly what they want
        setImages([]);
    }, [initialPhotos]);

    // Fit canvas scale to window perfectly
    useEffect(() => {
        const resize = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;
            // Pad by 40px
            const scaleW = (containerWidth - 80) / CANVAS_WIDTH;
            const scaleH = (containerHeight - 80) / CANVAS_HEIGHT;
            setScale(Math.min(scaleW, scaleH));
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Selection helpers
    const checkDeselect = (e) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) setSelectedId(null);
    };

    // Keyboard deletions
    useEffect(() => {
        const onKey = (e) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
                setImages(imgs => imgs.filter(img => img.id !== selectedId));
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedId]);


    // Layer manipulation logic
    const bringToFront = () => {
        if (!selectedId) return;
        const items = images.slice();
        const item = items.find(i => i.id === selectedId);
        const index = items.indexOf(item);
        if (index < items.length - 1) {
            items.splice(index, 1);
            items.push(item);
            setImages(items);
        }
    };
    
    const sendToBack = () => {
        if (!selectedId) return;
        const items = images.slice();
        const item = items.find(i => i.id === selectedId);
        const index = items.indexOf(item);
        if (index > 0) {
            items.splice(index, 1);
            items.unshift(item);
            setImages(items);
        }
    };

    const handleDelete = () => {
        if (!selectedId) return;
        setImages(images.filter(img => img.id !== selectedId));
        setSelectedId(null);
    }

    const togglePhoto = (photo) => {
        const exists = images.find(img => img.id === photo.id);
        if (exists) {
            setImages(images.filter(img => img.id !== photo.id));
            if (selectedId === photo.id) setSelectedId(null);
        } else {
            // Add to center
            const staggerX = (Math.random() * 100) - 50;
            const staggerY = (Math.random() * 100) - 50;
            const newImg = {
                id: photo.id,
                url: photo.url,
                x: (CANVAS_WIDTH / 2) - 150 + staggerX,
                y: (CANVAS_HEIGHT / 2) - 150 + staggerY,
                width: 300,
                height: 300,
                rotation: 0
            };
            setImages(prev => [...prev, newImg]);
            setSelectedId(photo.id);
            setActiveLayoutCols(null); // Custom addition breaks auto layout grid
        }
    };

    const applyTemplate = (template) => {
        const imageSlots = template.layers.filter(l => l.type === 'image');
        const textSlots  = template.layers.filter(l => l.type === 'text');
        
        // Map available photos into the image slots sequentially
        const newImages = imageSlots.map((slot, i) => {
            // Cycle through available photos if we have fewer than slots
            const photo = availablePhotos.length > 0 
                ? availablePhotos[i % availablePhotos.length] 
                : null;
            
            return {
                id: photo ? photo.id : uuidv4(),
                url: photo ? photo.url : '',
                x: slot.x,
                y: slot.y,
                width: slot.width,
                height: slot.height,
                rotation: 0,
                isTemplateSlot: true,
            };
        }).filter(img => img.url); // Only include ones with actual photos

        // Add text layers as special entries
        const textImages = textSlots.map(slot => ({
            id: uuidv4(),
            type: 'text',
            text: slot.text,
            fontSize: slot.fontSize || 24,
            fontStyle: slot.fontStyle || 'normal',
            fill: slot.fill || '#1E293B',
            x: slot.x,
            y: slot.y,
            rotation: 0,
        }));

        setImages([...newImages, ...textImages]);
        setSelectedId(null);
        setActiveLayoutCols(null);
    };

    const applyCrop = (ratioType) => {
        if (!selectedId) return;
        const items = images.slice();
        const idx = items.findIndex(i => i.id === selectedId);
        if (idx === -1) return;

        const img = { ...items[idx] };
        if (!img.naturalWidth || !img.naturalHeight) return;

        const nW = img.naturalWidth;
        const nH = img.naturalHeight;
        let crop = undefined;
        let newW = img.width;
        let newH = img.height;

        if (ratioType === 'reset') {
            crop = undefined;
            // Best effort to restore natural layout
            newH = img.width / (nW / nH);
        } else {
            let targetRatio = 1; // square
            if (ratioType === 'portrait') targetRatio = 4 / 5;
            if (ratioType === 'landscape') targetRatio = 16 / 9;

            const imageRatio = nW / nH;
            let cropW = nW;
            let cropH = nH;

            // Fit crop box completely inside natural image bounds
            if (imageRatio > targetRatio) {
                cropW = nH * targetRatio;
                cropH = nH;
            } else {
                cropH = nW / targetRatio;
                cropW = nW;
            }

            crop = {
                x: (nW - cropW) / 2, // Center crop perfectly
                y: (nH - cropH) / 2,
                width: cropW,
                height: cropH
            };

            // Shape visual canvas box to match this perfect new ratio
            newH = img.width / targetRatio;
        }

        items[idx] = { ...img, crop, width: newW, height: newH };
        setImages(items);
        setActiveLayoutCols(null);
    };

    const handleExport = () => {
        if (!stageRef.current) return;
        setIsExporting(true);
        setSelectedId(null); // Clear selection rings for export

        // Provide brief delay for transformer rings to vanish
        setTimeout(() => {
            try {
                // Native Konva high-res export (bypassing any DOM css issues)
                const dataURL = stageRef.current.toDataURL({ 
                    pixelRatio: 2, 
                    mimeType: 'image/jpeg', 
                    quality: 1 
                });
                saveAs(dataURL, `Photo-Collage-${Date.now()}.jpg`);
                addToast("Collage exported successfully!", "success");
            } catch (err) {
                console.error("Export failed:", err);
                addToast("Failed to export. Ensure all images have loaded successfully.", "error");
            } finally {
                setIsExporting(false);
            }
        }, 150);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: TOKENS.colors.background,
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter", -apple-system, sans-serif',
            color: TOKENS.colors.text,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${TOKENS.colors.border}`,
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                zIndex: 10,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'white', border: `1px solid ${TOKENS.colors.border}`,
                            color: TOKENS.colors.text, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontSize: '0.9rem', fontWeight: '600',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <ArrowLeft size={18} /> {backLabel}
                    </button>
                    <div style={{ width: '1px', height: '24px', background: TOKENS.colors.border }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: '#EEF2FF', color: TOKENS.colors.primary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Layers size={18} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: TOKENS.colors.text }}>Interactive Canvas Editor</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={handleExport}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.25rem', borderRadius: '8px',
                            background: `linear-gradient(135deg, ${TOKENS.colors.primary} 0%, ${TOKENS.colors.primaryHover} 100%)`,
                            border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                            fontSize: '0.9rem',
                        }}
                    >
                        {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {isExporting ? 'Exporting HD...' : 'Export High-Res JPG'}
                    </button>
                </div>
            </header>

            {/* Main Editor Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left Sidebar Toolbar */}
                <div style={{
                    width: '300px', background: TOKENS.colors.surface, borderRight: `1px solid ${TOKENS.colors.border}`,
                    padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem',
                    zIndex: 20, flexShrink: 0
                }}>
                    
                    {/* Object Controls Tools */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, marginBottom: '1rem', fontWeight: '700' }}>Active Photo Tools</h3>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={bringToFront} disabled={!selectedId} style={{ flex: 1, ...btnStyle(!!selectedId) }}>
                                <BringToFront size={16} /> Front
                            </button>
                            <button onClick={sendToBack} disabled={!selectedId} style={{ flex: 1, ...btnStyle(!!selectedId) }}>
                                <SendToBack size={16} /> Back
                            </button>
                        </div>
                        <button onClick={handleDelete} disabled={!selectedId} style={{ width: '100%', marginTop: '0.5rem', background: selectedId ? '#FEE2E2' : '#F1F5F9', color: selectedId ? '#EF4444' : '#94A3B8', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: selectedId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600' }}>
                            <Trash2 size={16} /> Delete Photo
                        </button>
                        
                        {/* Crop Tools */}
                        <div style={{ marginTop: '1.5rem', opacity: selectedId ? 1 : 0.5, pointerEvents: selectedId ? 'auto' : 'none' }}>
                            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, marginBottom: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Crop size={14} /> Crop Shape
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <button onClick={() => applyCrop('square')} style={btnStyle(false)}>
                                    <Square size={16} /> 1:1
                                </button>
                                <button onClick={() => applyCrop('portrait')} style={btnStyle(false)}>
                                    <RectangleVertical size={16} /> 4:5
                                </button>
                                <button onClick={() => applyCrop('landscape')} style={btnStyle(false)}>
                                    <RectangleHorizontal size={16} /> 16:9
                                </button>
                                <button onClick={() => applyCrop('reset')} style={btnStyle(false)}>
                                    <RotateCcw size={16} /> Reset
                                </button>
                            </div>
                        </div>

                        {!selectedId && <p style={{ fontSize: '0.75rem', color: TOKENS.colors.textDim, marginTop: '1rem', textAlign: 'center' }}>Click a photo on the canvas to select it for editing.</p>}
                    </div>

                    <hr style={{ border: 'none', borderTop: `1px solid ${TOKENS.colors.border}` }} />
                    
                    {/* Auto Layout Setters */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, marginBottom: '1rem', fontWeight: '700' }}>Auto-Grid Layouts</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button className="layout-btn" onClick={() => handleAutoLayoutSelected('grid2')} style={layoutBtnStyle}>
                                <Layout size={20} /> 2 Col
                            </button>
                            <button className="layout-btn" onClick={() => handleAutoLayoutSelected('grid3')} style={layoutBtnStyle}>
                                <LayoutGrid size={20} /> 3 Col
                            </button>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, margin: 0, fontWeight: '700' }}>Generation Gap</h3>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: TOKENS.colors.primary }}>{gap}px</span>
                            </div>
                            <input type="range" min="0" max="150" value={gap} onChange={(e) => {
                                const newGap = parseInt(e.target.value);
                                setGap(newGap);
                                if (activeLayoutCols) {
                                    setImages(prev => applyGridLayout(activeLayoutCols, newGap, prev));
                                }
                            }} style={{ width: '100%', accentColor: TOKENS.colors.primary, cursor: 'pointer' }} />
                        </div>
                        <p style={{ fontSize: '0.7rem', color: TOKENS.colors.textDim, marginTop: '0.75rem', lineHeight: 1.4 }}>Tip: Once photos are generated onto the Canvas, you can freely drag, resize, and rotate them!</p>
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: `1px solid ${TOKENS.colors.border}` }} />

                    {/* Design Templates */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, marginBottom: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Palette size={14} /> Design Templates
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {COLLAGE_TEMPLATES.map(t => (
                                <TemplatePreview 
                                    key={t.id} 
                                    template={t} 
                                    onClick={() => applyTemplate(t)}
                                    isActive={false}
                                />
                            ))}
                        </div>
                        {availablePhotos.length === 0 && (
                            <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '0.75rem', lineHeight: 1.4 }}>Add photos from the cluster below before applying a template.</p>
                        )}
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: `1px solid ${TOKENS.colors.border}` }} />

                    {/* Cluster Photos */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.colors.textDim, marginBottom: '1rem', fontWeight: '700' }}>Cluster Photos ({images.length}/{availablePhotos.length})</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {availablePhotos.map(photo => {
                                const isAdded = images.some(img => img.id === photo.id);
                                return (
                                    <div 
                                        key={photo.id} 
                                        onClick={() => togglePhoto(photo)}
                                        style={{ 
                                            aspectRatio: '1', 
                                            borderRadius: '6px', 
                                            overflow: 'hidden', 
                                            cursor: 'pointer',
                                            border: isAdded ? `2px solid ${TOKENS.colors.primary}` : '2px solid transparent',
                                            opacity: isAdded ? 1 : 0.6,
                                            transition: 'all 0.1s',
                                            backgroundImage: `url(${photo.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            pointerEvents: 'auto'
                                        }} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Canvas Area wrapper */}
                <div ref={containerRef} style={{
                    flex: 1, backgroundColor: '#E2E8F0',
                    backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                    backgroundSize: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden'
                }}>
                    
                    {/* Visual Canvas Drop Shadow Box */}
                    <div style={{
                        width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        backgroundColor: 'white',
                        position: 'relative'
                    }}>
                        {/* React Konva Stage */}
                        <Stage
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            onMouseDown={checkDeselect}
                            onTouchStart={checkDeselect}
                            ref={stageRef}
                            style={{ 
                                transform: `scale(${scale})`, 
                                transformOrigin: 'top left',
                                cursor: selectedId ? 'move' : 'default'
                            }}
                        >
                            <Layer>
                                {/* Fixed white paper background ensures transparent photos don't bleed visually */}
                                <Rect
                                    x={0}
                                    y={0}
                                    width={CANVAS_WIDTH}
                                    height={CANVAS_HEIGHT}
                                    fill="white"
                                />

                                {images.map((img, i) => {
                                    // Render text layers differently
                                    if (img.type === 'text') {
                                        return (
                                            <KonvaText
                                                key={img.id}
                                                x={img.x}
                                                y={img.y}
                                                text={img.text}
                                                fontSize={img.fontSize || 24}
                                                fontStyle={img.fontStyle || 'normal'}
                                                fill={img.fill || '#1E293B'}
                                                draggable
                                                rotation={img.rotation || 0}
                                                onClick={() => setSelectedId(img.id)}
                                                onTap={() => setSelectedId(img.id)}
                                                onDragEnd={(e) => {
                                                    const imgs = images.slice();
                                                    imgs[i] = { ...img, x: e.target.x(), y: e.target.y() };
                                                    setImages(imgs);
                                                }}
                                            />
                                        );
                                    }
                                    
                                    return (
                                        <URLImage
                                            key={img.id}
                                            imageElem={img}
                                            shapeProps={img}
                                            isSelected={img.id === selectedId}
                                            onSelect={() => setSelectedId(img.id)}
                                            onChange={(newAttrs) => {
                                                const imgs = images.slice();
                                                imgs[i] = newAttrs;
                                                setImages(imgs);
                                                setActiveLayoutCols(null);
                                            }}
                                        />
                                    );
                                })}
                            </Layer>
                        </Stage>
                    </div>

                    <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '0.8rem', fontWeight: '600', color: TOKENS.colors.textDim, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Maximize size={15} color={TOKENS.colors.primary} /> 
                        Poster Size ({(CANVAS_WIDTH * scale).toFixed(0)} x {(CANVAS_HEIGHT * scale).toFixed(0)} display)
                    </div>
                </div>
            </div>
        </div>
    );
};

// Generic button styles helper
const btnStyle = (active) => ({
    padding: '0.6rem', background: active ? '#EEF2FF' : '#F8FAFC', color: active ? '#4F46E5' : '#64748B',
    border: `1px solid ${active ? '#C7D2FE' : '#E2E8F0'}`, borderRadius: '6px', fontSize: '0.8rem',
    fontWeight: '600', cursor: active ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
});

const layoutBtnStyle = {
    padding: '1rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px',
    color: '#475569', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '0.75rem'
};

export default CollageManager;
