import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOKENS, MOOD_PRESETS, DEFAULT_MUSIC_TRACKS } from './constants';
import { Player } from '@remotion/player';
import { CinematicComposition } from '../../../../remotion/CinematicComposition';

// ========================================
// PHASE 1: VISUAL WEIGHT ANALYZER
// ========================================
class VisualWeightAnalyzer {
    static analyze(imageElement) {
        try {
            const canvas = document.createElement('canvas');
            const maxDim = 400;
            const scale = Math.min(maxDim / imageElement.width, maxDim / imageElement.height);
            canvas.width = imageElement.width * scale;
            canvas.height = imageElement.height * scale;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const gridW = Math.floor(canvas.width / 3);
            const gridH = Math.floor(canvas.height / 3);
            const regions = [];

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    let edgeScore = 0;
                    let pixelCount = 0;

                    for (let y = row * gridH; y < (row + 1) * gridH && y < canvas.height - 1; y++) {
                        for (let x = col * gridW; x < (col + 1) * gridW && x < canvas.width - 1; x++) {
                            const i = (y * canvas.width + x) * 4;
                            const iRight = i + 4;
                            const iDown = ((y + 1) * canvas.width + x) * 4;

                            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                            const grayRight = 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2];
                            const grayDown = 0.299 * data[iDown] + 0.587 * data[iDown + 1] + 0.114 * data[iDown + 2];

                            edgeScore += Math.abs(gray - grayRight) + Math.abs(gray - grayDown);
                            pixelCount++;
                        }
                    }

                    regions.push({
                        row, col,
                        x: (col + 0.5) / 3,
                        y: (row + 0.5) / 3,
                        score: edgeScore / pixelCount
                    });
                }
            }

            regions.sort((a, b) => b.score - a.score);

            return {
                primary: { x: regions[0].x, y: regions[0].y, weight: 1.0 },
                secondary: { x: regions[1].x, y: regions[1].y, weight: 0.75 },
                tertiary: { x: regions[2].x, y: regions[2].y, weight: 0.5 },
                aspectRatio: canvas.width / canvas.height
            };
        } catch (_e) {
            // CORS error - return center-focused fallback
            console.log('VisualWeightAnalyzer: CORS fallback used');
            return {
                primary: { x: 0.5, y: 0.4, weight: 1.0 },
                secondary: { x: 0.3, y: 0.5, weight: 0.75 },
                tertiary: { x: 0.7, y: 0.5, weight: 0.5 },
                aspectRatio: imageElement.width / imageElement.height
            };
        }
    }
}

// ========================================
// MOTION PATTERNS
// ========================================
const MOTION_PATTERNS = {
    HERO_REVEAL: 'hero_reveal',
    EPIC_PULLBACK: 'epic_pullback',
    PAN_DISCOVER: 'pan_discover',
    DIAGONAL_DRIFT: 'diagonal_drift',
    PORTRAIT_FOCUS: 'portrait_focus',
    LANDSCAPE_SWEEP: 'landscape_sweep',
    INTIMATE_CLOSE: 'intimate_close',
    BREATHE: 'breathe',
    PARALLAX_TILT: 'parallax_tilt',
    ORBIT: 'orbit',
};

class MotionPathGenerator {
    static generate(analysis) {
        const { primary, aspectRatio } = analysis;
        const isPortrait = aspectRatio < 0.8;
        const isLandscape = aspectRatio > 1.4;
        const isSquare = aspectRatio >= 0.8 && aspectRatio <= 1.2;

        let pattern;
        if (isPortrait && primary.y < 0.4) pattern = MOTION_PATTERNS.PORTRAIT_FOCUS;
        else if (isLandscape) pattern = MOTION_PATTERNS.LANDSCAPE_SWEEP;
        else if (primary.x < 0.3) pattern = MOTION_PATTERNS.PAN_DISCOVER;
        else if (primary.x > 0.7) pattern = MOTION_PATTERNS.EPIC_PULLBACK;
        else if (isSquare) pattern = MOTION_PATTERNS.INTIMATE_CLOSE;
        else pattern = MOTION_PATTERNS.HERO_REVEAL;

        // Add 3D effects randomly
        if (Math.random() < 0.4) {
            const alternates = [MOTION_PATTERNS.PARALLAX_TILT, MOTION_PATTERNS.ORBIT];
            pattern = alternates[Math.floor(Math.random() * alternates.length)];
        }

        return this.getPatternTransform(pattern, primary);
    }

    static getPatternTransform(pattern, focal) {
        const microRotate = () => (Math.random() - 0.5) * 1.2;
        const transforms = {
            [MOTION_PATTERNS.HERO_REVEAL]: {
                start: { scale: 1, x: 0, y: 0, rotate: 0, perspective: 1000 },
                end: { scale: 1.18, x: (0.5 - focal.x) * 15, y: (0.5 - focal.y) * 15, rotate: microRotate(), perspective: 1000 }
            },
            [MOTION_PATTERNS.EPIC_PULLBACK]: {
                start: { scale: 1.25, x: (0.5 - focal.x) * 20, y: (0.5 - focal.y) * 20, rotate: microRotate(), perspective: 1000 },
                end: { scale: 1, x: 0, y: 0, rotate: 0, perspective: 1000 }
            },
            [MOTION_PATTERNS.PAN_DISCOVER]: {
                start: { scale: 1.15, x: -10, y: 0, rotate: 0, perspective: 1000 },
                end: { scale: 1.2, x: 10, y: 0, rotate: microRotate(), perspective: 1000 }
            },
            [MOTION_PATTERNS.PARALLAX_TILT]: {
                start: { scale: 1.1, x: 0, y: 0, rotateX: 2, rotateY: -2, perspective: 800 },
                end: { scale: 1.2, x: 0, y: 0, rotateX: -2, rotateY: 2, perspective: 800 }
            },
            [MOTION_PATTERNS.ORBIT]: {
                start: { scale: 1.1, x: 0, y: 0, rotate: -2, perspective: 1000 },
                end: { scale: 1.15, x: 0, y: 0, rotate: 2, perspective: 1000 }
            },
            [MOTION_PATTERNS.DIAGONAL_DRIFT]: {
                start: { scale: 1, x: -5, y: -5, rotate: -0.5, perspective: 1000 },
                end: { scale: 1.14, x: 5, y: 5, rotate: 0.5, perspective: 1000 }
            },
            [MOTION_PATTERNS.PORTRAIT_FOCUS]: {
                start: { scale: 1.05, x: 0, y: 8, rotate: 0, perspective: 1000 },
                end: { scale: 1.18, x: 0, y: -8, rotate: microRotate(), perspective: 1000 }
            },
            [MOTION_PATTERNS.LANDSCAPE_SWEEP]: {
                start: { scale: 1.12, x: 12, y: 0, rotate: 0, perspective: 1000 },
                end: { scale: 1.08, x: -12, y: 0, rotate: microRotate(), perspective: 1000 }
            },
            [MOTION_PATTERNS.INTIMATE_CLOSE]: {
                start: { scale: 1, x: 0, y: 0, rotate: 0, perspective: 1000 },
                end: { scale: 1.22, x: (0.5 - focal.x) * 18, y: (0.5 - focal.y) * 18, rotate: microRotate(), perspective: 1000 }
            },
            [MOTION_PATTERNS.BREATHE]: {
                start: { scale: 1, x: 0, y: 0, rotate: 0, perspective: 1000 },
                end: { scale: 1.08, x: 0, y: 0, rotate: microRotate(), perspective: 1000 }
            },
        };

        return { pattern, ...transforms[pattern], easing: TOKENS.transitions.cinematic };
    }
}

// ========================================
// PHOTO QUALITY ANALYZER
// ========================================
class PhotoQualityAnalyzer {
    static analyze(imageElement) {
        try {
            const canvas = document.createElement('canvas');
            const maxDim = 400;
            const scale = Math.min(maxDim / imageElement.width, maxDim / imageElement.height);
            canvas.width = imageElement.width * scale;
            canvas.height = imageElement.height * scale;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const resolutionScore = Math.min(30, (imageElement.width * imageElement.height) / 100000);

            let sharpness = 0;
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const i = (y * canvas.width + x) * 4;
                    const center = data[i];
                    const top = data[((y - 1) * canvas.width + x) * 4];
                    const bottom = data[((y + 1) * canvas.width + x) * 4];
                    const left = data[(y * canvas.width + (x - 1)) * 4];
                    const right = data[(y * canvas.width + (x + 1)) * 4];
                    sharpness += Math.abs(4 * center - top - bottom - left - right);
                }
            }
            const sharpnessScore = Math.min(40, sharpness / (canvas.width * canvas.height * 10));

            let saturationSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                saturationSum += max === 0 ? 0 : (max - min) / max;
            }
            const colorScore = Math.min(15, (saturationSum / (data.length / 4)) * 20);

            let brightnessSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            const avgBrightness = brightnessSum / (data.length / 4);
            const brightnessScore = Math.min(15, 15 - Math.abs(avgBrightness - 128) / 10);

            const commonScreenshotSizes = [[1920, 1080], [1366, 768], [1280, 720], [2560, 1440]];
            let screenshotPenalty = 0;
            for (const [w, h] of commonScreenshotSizes) {
                if (Math.abs(imageElement.width - w) < 10 && Math.abs(imageElement.height - h) < 10) {
                    screenshotPenalty = 25;
                    break;
                }
            }

            const totalScore = resolutionScore + sharpnessScore + colorScore + brightnessScore - screenshotPenalty;

            return {
                score: Math.max(0, totalScore),
                isScreenshot: screenshotPenalty > 0
            };
        } catch (_e) {
            // CORS error - return high quality fallback (assume good quality)
            console.log('PhotoQualityAnalyzer: CORS fallback used');
            const resolutionScore = Math.min(30, (imageElement.width * imageElement.height) / 100000);
            return {
                score: resolutionScore + 30, // Assume decent quality
                isScreenshot: false
            };
        }
    }
}

// ========================================
// LAYOUT GENERATOR
// ========================================
class LayoutGenerator {
    static createSlides(photos) {
        const slides = [];
        let i = 0;

        while (i < photos.length) {
            const current = photos[i];
            const next = photos[i + 1];

            // Check if we can make a split screen (two vertical photos)
            if (next && this.isPortrait(current) && this.isPortrait(next) && Math.random() > 0.3) {
                slides.push({
                    type: 'split',
                    photos: [current, next],
                    id: `slide-${i}`,
                    duration: 0 // Will be set later
                });
                i += 2;
            } else {
                // Single photo slide
                slides.push({
                    type: 'single',
                    photos: [current],
                    id: `slide-${i}`,
                    duration: 0
                });
                i++;
            }
        }
        return slides;
    }

    static isPortrait(photo) {
        return photo.imageElement.height > photo.imageElement.width;
    }
}

// ========================================
// FACE DETECTOR (Simplified)
// ========================================
class SimpleFaceDetector {
    static detect(imageElement) {
        try {
            const canvas = document.createElement('canvas');
            const maxDim = 300;
            const scale = Math.min(maxDim / imageElement.width, maxDim / imageElement.height);
            canvas.width = imageElement.width * scale;
            canvas.height = imageElement.height * scale;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

            const searchHeight = Math.floor(canvas.height * 0.6);
            const imageData = ctx.getImageData(0, 0, canvas.width, searchHeight);
            const data = imageData.data;

            let skinPixels = 0;
            const totalPixels = (canvas.width * searchHeight);

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
                    skinPixels++;
                }
            }

            return skinPixels / totalPixels > 0.05;
        } catch (_e) {
            // CORS error - assume face is present (these are face cluster photos after all)
            console.log('SimpleFaceDetector: CORS fallback used');
            return true;
        }
    }
}

// ========================================
// AMBIENT GLOW BACKGROUND
// ========================================
const AmbientBackground = ({ mood }) => (
    <div style={{
        position: 'absolute',
        inset: 0,
        background: '#050505',
        overflow: 'hidden'
    }}>
        <motion.div
            animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{
                position: 'absolute',
                top: '5%',
                left: '15%',
                width: '70vw',
                height: '70vh',
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${mood?.accentColor || TOKENS.colors.gold}12 0%, transparent 70%)`,
                filter: 'blur(100px)',
            }}
        />
        <motion.div
            animate={{
                scale: [1.3, 1, 1.3],
                opacity: [0.1, 0.25, 0.1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{
                position: 'absolute',
                bottom: '5%',
                right: '5%',
                width: '55vw',
                height: '55vh',
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${TOKENS.colors.champagne}08 0%, transparent 70%)`,
                filter: 'blur(120px)',
            }}
        />
    </div>
);

// ========================================
// PULSING ORB LOADER
// ========================================
const PulsingOrbLoader = ({ progress = 0 }) => {
    const size = 100;
    const strokeWidth = 1.5;
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Ambient glow behind */}
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    width: size * 1.6,
                    height: size * 1.6,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${TOKENS.colors.gold}20 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                }}
            />
            {/* Progress ring */}
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={TOKENS.colors.gold} strokeWidth={strokeWidth} strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 6px ${TOKENS.colors.gold}40)` }}
                />
            </svg>
            {/* Center percentage */}
            <span style={{
                position: 'absolute',
                fontFamily: TOKENS.fonts.body,
                fontSize: '0.85rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.05em',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {Math.round(progress)}%
            </span>
        </div>
    );
};

// ========================================
// MAIN MANAGER COMPONENT
// ========================================
const CinematicManager = ({ initialPhotos = [], onClose, mode = 'full', eventName }) => {
    const [photos, setPhotos] = useState([]);
    const [processedPhotos, setProcessedPhotos] = useState([]);
    const [music, setMusic] = useState(null);
    const [selectedMood] = useState('cinematic');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState({ text: '', progress: 0 });
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeline, setTimeline] = useState([]);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isExportingVideo, setIsExportingVideo] = useState(false);
    const playerRef = useRef(null);



    const mood = MOOD_PRESETS[selectedMood];

    // Initialize from props
    useEffect(() => {
        const loadPhotos = async () => {
            if (!initialPhotos.length) {
                console.log('CinematicManager: No initial photos provided');
                setIsInitializing(false);
                return;
            }

            console.log('CinematicManager: Loading', initialPhotos.length, 'photos');
            console.log('Sample URLs:', initialPhotos.slice(0, 3));

            const loadedPhotos = await Promise.all(
                initialPhotos.map(url => new Promise((resolve) => {
                    const img = new Image();
                    
                    const tryLoad = (useCors) => {
                        if (useCors) {
                            img.crossOrigin = "Anonymous";
                        } else {
                            img.crossOrigin = null;
                        }

                        img.onload = () => {
                            console.log(`CinematicManager: Loaded image (cors: ${useCors})`, url.substring(0, 50));
                            resolve({ url, imageElement: img });
                        };

                        img.onerror = (e) => {
                            if (useCors) {
                                console.warn('CinematicManager: CORS load failed, retrying without crossOrigin', url);
                                // Clean up and retry without CORS
                                img.onload = null;
                                img.onerror = null;
                                const retryImg = new Image();
                                retryImg.onload = () => {
                                    console.log('CinematicManager: Loaded image on retry', url.substring(0, 50));
                                    resolve({ url, imageElement: retryImg });
                                };
                                retryImg.onerror = (err) => {
                                    console.error('CinematicManager: Final failure loading image', url, err);
                                    resolve(null);
                                };
                                retryImg.src = url;
                            } else {
                                console.error('CinematicManager: Failed to load image without CORS', url, e);
                                resolve(null);
                            }
                        };
                        img.src = url;
                    };

                    // Start with CORS for analysis if it's an external URL
                    const needsCors = url.startsWith('http') && !url.includes(window.location.hostname);
                    tryLoad(needsCors);
                }))
            );

            const validPhotos = loadedPhotos.filter(p => p !== null);
            console.log('CinematicManager: Successfully loaded', validPhotos.length, 'of', initialPhotos.length, 'photos');
            setPhotos(validPhotos);
            setIsInitializing(false);
        };

        loadPhotos();
    }, [initialPhotos]);

    // Auto-generate when photos are loaded
    useEffect(() => {
        if (photos.length > 0 && !isPlaying && !isAnalyzing && processedPhotos.length === 0) {
            generateMemory();
        }
    }, [photos.length, isPlaying, isAnalyzing, processedPhotos.length, generateMemory]);

    // Generate memory
    const generateMemory = useCallback(async () => {
        if (photos.length === 0) return;

        setIsAnalyzing(true);

        let musicToUse = music;
        if (!musicToUse) {
            // Should be initialized by default, but fallback just in case
            musicToUse = DEFAULT_MUSIC_TRACKS[0];
            setMusic(musicToUse);
        }

        // Analysis steps
        const steps = [
            { text: 'Analyzing photo quality...', progress: 15 },
            { text: 'Detecting visual weight...', progress: 35 },
            { text: 'Finding focal points...', progress: 55 },
            { text: 'Generating motion paths...', progress: 75 },
            { text: 'Choreographing your memory...', progress: 90 },
            { text: 'Preparing playback...', progress: 100 },
        ];

        for (const step of steps) {
            setAnalysisStep(step);
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Process photos
        const analyzed = photos.map(photo => {
            const quality = PhotoQualityAnalyzer.analyze(photo.imageElement);
            const hasFaces = SimpleFaceDetector.detect(photo.imageElement);
            const visualWeight = VisualWeightAnalyzer.analyze(photo.imageElement);
            const motion = MotionPathGenerator.generate(visualWeight);

            return {
                ...photo,
                quality,
                hasFaces,
                visualWeight,
                motion,
                score: quality.score + (hasFaces ? 15 : 0)
            };
        });

        const filtered = analyzed
            .filter(p => !p.quality.isScreenshot)
            // Allow slightly lower quality for clusters as they might be smaller sets
            .sort((a, b) => b.score - a.score);

        const topN = Math.min(50, filtered.length);
        let curated = filtered.slice(0, topN);

        // Fallback if filtering removed too many
        if (curated.length < 5 && analyzed.length > 0) {
            curated = analyzed.slice(0, Math.min(20, analyzed.length));
        }

        // Mark hero shots
        const heroCount = Math.ceil(curated.length * 0.2);
        curated.slice(0, heroCount).forEach(photo => { photo.isHero = true; });

        // Generate Layouts (Slides)
        const slides = LayoutGenerator.createSlides(curated);

        // Create timeline
        const generatedTimeline = createTimeline(slides);
        setTimeline(generatedTimeline);
        setProcessedPhotos(slides);

        await new Promise(resolve => setTimeout(resolve, 500));

        setIsAnalyzing(false);
        setIsPlaying(true);
    }, [photos, music]);

    // Create timeline
    const createTimeline = (slides) => {
        const baseDuration = 2.5;
        const timeline = [];
        let currentTime = 0;

        slides.forEach((slide, i) => {
            let duration = baseDuration;

            if (slide.type === 'single') {
                duration += (Math.random() - 0.5) * 1.5;
                if (slide.photos[0].isHero) duration *= 1.5; // Longer for hero shots
            } else {
                duration *= 1.2; // Longer for split screens
            }

            // Update slide duration
            slide.duration = duration;

            timeline.push({
                index: i,
                startTime: currentTime,
                duration,
                endTime: currentTime + duration
            });

            currentTime += duration;
        });

        return timeline;
    };

    // Calculate total duration from timeline
    const totalDuration = useMemo(() => {
        if (timeline.length === 0) return 0;
        return timeline[timeline.length - 1]?.endTime || 0;
    }, [timeline]);

    // Simplified progress tracking for UI only (optional, since Player handles playback)
    // We can keeps some state if we want to show a custom progress bar, but for now let's reliance on Player controls
    // or just simple state if needed.
    // For now, removing the complex manual sync logic.

    const handleDownloadVideo = async () => {
        if (!playerRef.current || processedPhotos.length === 0) return;
        if (isExportingVideo) return;

        const confirmExport = window.confirm(
            "Ready to export your cinematic memory? This will generate a high-quality video file directly in your browser. Start now?"
        );
        if (!confirmExport) return;

        setIsExportingVideo(true);
        const originalFrame = playerRef.current.getCurrentFrame();
        playerRef.current.pause();

        try {
            const fps = 30;
            const totalFrames = Math.floor(totalDuration * fps);
            const width = 1920;
            const height = 1080;

            // 1. Setup Offscreen Canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });

            // 2. Setup Recording
            const stream = canvas.captureStream(fps);
            const chunks = [];

            // Attempt to capture audio
            let finalStream = stream;
            const containerNode = playerRef.current.getContainerNode();
            const audioElem = containerNode?.querySelector('audio');

            if (audioElem) {
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const dest = audioCtx.createMediaStreamDestination();
                    const source = audioCtx.createMediaElementSource(audioElem);
                    source.connect(dest);
                    source.connect(audioCtx.destination);
                    finalStream = new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
                } catch (e) { console.warn("Audio bypass failed:", e); }
            }

            // Setup MediaRecorder
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
                mimeType = 'video/webm; codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
                mimeType = 'video/webm; codecs=vp8';
            }

            const recorder = new MediaRecorder(finalStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 15000000 // 15mbps
            });

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                try {
                    const blob = new Blob(chunks, { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `Cinematic_Memory_${new Date().getTime()}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                } catch (error) {
                    console.error("Error creating download blob:", error);
                    alert("Failed to save the exported video file.");
                } finally {
                    setIsExportingVideo(false);
                    playerRef.current.seekTo(originalFrame);

                    // Stop any tracks we created
                    finalStream.getTracks().forEach(track => track.stop());
                }
            };

            recorder.start();

            // 3. Helper: Ken Burns Draw
            const drawKenBurns = (photo, frameInSlide, durationInFrames, rect) => {
                const p = frameInSlide / durationInFrames;
                const { start, end } = photo.motion;

                // Simple easeInOut quint if easing is missing, or linear
                const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                const t = ease(p);

                const scale = start.scale + (end.scale - start.scale) * t;
                const tx = start.x + (end.x - start.x) * t;
                const ty = start.y + (end.y - start.y) * t;

                ctx.save();
                // Clip to rect
                ctx.beginPath();
                ctx.rect(rect.x, rect.y, rect.w, rect.h);
                ctx.clip();

                const img = photo.imageElement;
                const imgAspect = img.width / img.height;
                const rectAspect = rect.w / rect.h;

                let drawW, drawH;
                if (imgAspect > rectAspect) {
                    // Image is wider than rect context. 
                    // Fit to width, scale height down (letterbox)
                    drawW = rect.w;
                    drawH = rect.w / imgAspect;
                } else {
                    // Image is taller than rect context.
                    // Fit to height, scale width down (pillarbox)
                    drawH = rect.h;
                    drawW = rect.h * imgAspect;
                }

                // Apply Ken Burns
                const finalW = drawW * scale;
                const finalH = drawH * scale;
                const offsetX = (rect.w - finalW) / 2 + (tx / 100) * finalW;
                const offsetY = (rect.h - finalH) / 2 + (ty / 100) * finalH;

                ctx.drawImage(img, rect.x + offsetX, rect.y + offsetY, finalW, finalH);
                ctx.restore();
            };

            // 4. Render Loop
            for (let f = 0; f < totalFrames; f++) {
                setAnalysisStep({ text: `Rendering frame ${f}/${totalFrames}...`, progress: Math.round((f / totalFrames) * 100) });

                // Find active slide(s) - handle overlapping transitions
                const time = f / fps;
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, width, height);

                // Multi-slide transition check (Remotion overlapped duration logic)
                // Simplified: draw the active slide
                let activeSlideIndex = timeline.findIndex(t => time >= t.startTime && time <= t.endTime);
                if (activeSlideIndex === -1) activeSlideIndex = timeline.length - 1;

                const slide = processedPhotos[activeSlideIndex];
                const tInfo = timeline[activeSlideIndex];
                const frameInSlide = f - Math.floor(tInfo.startTime * fps);
                const durationInFrames = Math.floor(tInfo.duration * fps);

                if (slide.type === 'split') {
                    drawKenBurns(slide.photos[0], frameInSlide, durationInFrames, { x: 0, y: 0, w: width / 2, h: height });
                    drawKenBurns(slide.photos[1], frameInSlide, durationInFrames, { x: width / 2, y: 0, w: width / 2, h: height });
                } else {
                    drawKenBurns(slide.photos[0], frameInSlide, durationInFrames, { x: 0, y: 0, w: width, h: height });
                }

                // 5. Overlays
                // Letterbox
                ctx.fillStyle = 'black';
                const lbH = height * 0.12;
                ctx.fillRect(0, 0, width, lbH);
                ctx.fillRect(0, height - lbH, width, lbH);

                // Vignette
                const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.7);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Text (Title)
                if (f < 180) { // First 6 seconds
                    const textP = Math.min(1, f / 45); // Fade in
                    const textOutP = f > 120 ? Math.max(0, 1 - (f - 120) / 40) : 1;
                    const opacity = textP * textOutP;

                    ctx.globalAlpha = opacity;
                    ctx.fillStyle = 'white';
                    ctx.font = '400 80px "Cinzel", serif';
                    ctx.textAlign = 'center';
                    // ctx.textTransform = 'uppercase'; // Not supported by canvas
                    const title = (eventName || "Cinematic Memory").toUpperCase();

                    // Letter spacing hack for canvas
                    const chars = title.split('');
                    const spacing = 15;
                    let totalW = 0;
                    chars.forEach(c => totalW += ctx.measureText(c).width + spacing);

                    let currX = (width - totalW) / 2;
                    chars.forEach(c => {
                        ctx.fillText(c, currX, height / 2);
                        currX += ctx.measureText(c).width + spacing;
                    });

                    // Line
                    const lineW = 100 * Math.min(1, f / 60);
                    ctx.fillRect(width / 2 - lineW / 2, height / 2 + 40, lineW, 2);
                    ctx.globalAlpha = 1.0;
                }

                // Push frame to stream
                await new Promise(r => setTimeout(r, 0));
            }

            recorder.stop();
        } catch (err) {
            console.error("Export failure:", err);
            alert("Export failed: " + err.message);
            setIsExportingVideo(false);
            playerRef.current.seekTo(originalFrame);
        }
    };

    const isModal = mode === 'modal';

    return (
        <div style={{
            position: isModal ? 'relative' : 'fixed',
            inset: isModal ? 'auto' : 0,
            width: isModal ? '100%' : 'auto',
            height: isModal ? '100%' : 'auto',
            minHeight: isModal ? '400px' : 'auto',
            background: TOKENS.colors.black,
            color: TOKENS.colors.gold,
            fontFamily: TOKENS.fonts.body,
            zIndex: isModal ? 1 : 2000,
            overflow: 'hidden',
            borderRadius: isModal ? '16px' : 0
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>

            {/* Background Elements */}
            <AmbientBackground mood={mood} />



            {/* Loading / Analysis Screen */}
            <AnimatePresence>
                {(isAnalyzing || isInitializing) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.8 } }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 50,
                            gap: 32,
                        }}
                    >
                        <PulsingOrbLoader progress={analysisStep.progress} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={analysisStep.text}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.4 }}
                                    style={{
                                        fontFamily: TOKENS.fonts.body,
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.45)',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        fontWeight: 400,
                                        textAlign: 'center',
                                        margin: 0,
                                    }}
                                >
                                    {isInitializing ? 'Loading photos' : analysisStep.text}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Player */}
            {!isAnalyzing && !isInitializing && processedPhotos.length > 0 && (
                <>
                    <Player
                        ref={playerRef}
                        component={CinematicComposition}
                        inputProps={{ processedPhotos, mood: { ...mood, music }, eventName: eventName || "Cinematic Memory" }}
                        durationInFrames={Math.floor(totalDuration * 30)}
                        fps={30}
                        compositionWidth={1920}
                        compositionHeight={1080}
                        style={{
                            width: '100%',
                            height: '100%',
                            aspectRatio: '16/9',
                            maxWidth: '100vw',
                            maxHeight: '100vh',
                            objectFit: 'contain'
                        }}
                        controls
                        loop
                        autoPlay
                    />
                    <motion.button
                        onClick={handleDownloadVideo}
                        disabled={isExportingVideo}
                        whileHover={{ scale: isExportingVideo ? 1 : 1.05 }}
                        whileTap={{ scale: isExportingVideo ? 1 : 0.95 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(24px + env(safe-area-inset-top))',
                            right: isModal ? 'calc(50px + env(safe-area-inset-right))' : 'calc(24px + env(safe-area-inset-right))',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: isExportingVideo ? '#EF4444' : 'rgba(0,0,0,0.4)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: isExportingVideo ? 'not-allowed' : 'pointer',
                            backdropFilter: 'blur(20px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            marginRight: isModal ? '30px' : '60px'
                        }}
                    >
                        {isExportingVideo ? (
                            <>
                                <div className="spin-slow" style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                Generating Video...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export Video
                            </>
                        )}
                    </motion.button>
                </>
            )
            }

            {/* Empty State - No photos loaded */}
            {
                !isAnalyzing && !isInitializing && photos.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 50,
                            paddingTop: 'env(safe-area-inset-top)',
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            paddingLeft: 'env(safe-area-inset-left)',
                            paddingRight: 'env(safe-area-inset-right)',
                        }}
                    >
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1rem'
                        }}>📷</div>
                        <h2 style={{
                            fontFamily: TOKENS.fonts.display,
                            fontSize: '1.5rem',
                            color: TOKENS.colors.gold,
                            marginBottom: '0.5rem'
                        }}>
                            No Photos Available
                        </h2>
                        <p style={{
                            color: TOKENS.colors.champagne,
                            opacity: 0.7,
                            textAlign: 'center',
                            maxWidth: '300px'
                        }}>
                            Unable to load photos for this memory. Please try again or check if photos exist for this person.
                        </p>
                        <motion.button
                            onClick={onClose}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: `1px solid ${TOKENS.colors.gold}`,
                                background: 'transparent',
                                color: TOKENS.colors.gold,
                                cursor: 'pointer',
                                fontFamily: TOKENS.fonts.body
                            }}
                        >
                            Go Back
                        </motion.button>
                    </motion.div>
                )
            }

            {/* Close Button */}
            <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.92 }}
                style={{
                    position: 'absolute',
                    top: 'calc(24px + env(safe-area-inset-top))',
                    left: 'calc(24px + env(safe-area-inset-left))',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '1.2rem',
                    zIndex: 1000,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease',
                }}
                title="Close"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </motion.button>
        </div >
    );
};

export default CinematicManager;
