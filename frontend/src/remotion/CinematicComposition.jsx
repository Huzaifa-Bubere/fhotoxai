import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Img, Sequence, Audio } from 'remotion';

const TRANSITION_DURATION = 15;

const KenBurns = ({ src, motion }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const progress = frame / durationInFrames;

    const scale = interpolate(
        progress,
        [0, 1],
        [motion.start.scale, motion.end.scale],
        { extrapolateRight: 'clamp' }
    );

    const x = interpolate(
        progress,
        [0, 1],
        [motion.start.x, motion.end.x],
        { extrapolateRight: 'clamp' }
    );

    const y = interpolate(
        progress,
        [0, 1],
        [motion.start.y, motion.end.y],
        { extrapolateRight: 'clamp' }
    );

    return (
        <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
        }}>
            <Img
                src={src}
                style={{
                    transform: `scale(${scale}) translate(${x}%, ${y}%)`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};

const CinematicVignette = ({ strength = 0.5 }) => (
    <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,${strength}) 100%)`,
        zIndex: 11,
    }} />
);



const LightLeakOverlay = () => {
    const frame = useCurrentFrame();

    const opacity = interpolate(
        Math.sin(frame * 0.05),
        [-1, 1],
        [0.1, 0.4]
    );
    const x = interpolate(
        Math.cos(frame * 0.02),
        [-1, 1],
        [-20, 20]
    );

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(45deg, rgba(255,150,50,0.2) 0%, transparent 40%, rgba(255,100,100,0.1) 100%)',
            opacity,
            transform: `translateX(${x}%)`,
            zIndex: 13,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            filter: 'blur(30px)'
        }} />
    );
};

const SoftGlow = () => (
    <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 14,
        pointerEvents: 'none',
        backdropFilter: 'blur(20px)',
        opacity: 0.3,
        mixBlendMode: 'screen'
    }} />
);

const Letterbox = () => (
    <>
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '12%',
            background: 'black', zIndex: 20
        }} />
        <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%',
            background: 'black', zIndex: 20
        }} />
    </>
);

const ColorGradeOverlay = () => (
    <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)', // Subtle vignette
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)',
        zIndex: 15,
        pointerEvents: 'none',
        mixBlendMode: 'soft-light'
    }} />
);

const TextOverlay = ({ title }) => {
    const frame = useCurrentFrame();

    // Smooth fade in/out
    const opacity = interpolate(frame, [0, 45, 120, 160], [0, 1, 1, 0]);

    // Elegant tracking (letter spreading) animation
    const letterSpacing = interpolate(frame, [0, 160], [0.1, 0.4]);

    // Subtle float up
    const y = interpolate(frame, [0, 160], [10, -10]);

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column', // Prepare for subtitle or line
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30, // Above letterbox
            opacity
        }}>
            <h1 style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: '4rem',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.95)',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transform: `translateY(${y}px)`,
                letterSpacing: `${letterSpacing}em`,
                margin: 0,
                textAlign: 'center',
                textTransform: 'uppercase'
            }}>
                {title}
            </h1>
            <div style={{
                width: '60px',
                height: '1px',
                background: 'rgba(255,255,255,0.7)',
                marginTop: '20px',
                transform: `scaleX(${interpolate(frame, [0, 60], [0, 1])})`
            }} />
        </div>
    );
};

const SlideContainer = ({ children, index }) => {
    const frame = useCurrentFrame();

    const progress = interpolate(
        frame,
        [0, TRANSITION_DURATION],
        [0, 1],
        { extrapolateRight: 'clamp' }
    );

    // Fade opacity
    const opacity = index === 0 ? 1 : progress;

    // Blur dissolve effect: Starts blurry, becomes sharp
    const blur = index === 0 ? 0 : interpolate(progress, [0, 1], [15, 0]);

    // Slight zoom out during transition for depth
    const scale = index === 0 ? 1 : interpolate(progress, [0, 1], [1.1, 1]);

    return (
        <div style={{
            width: '100%', height: '100%',
            opacity,
            filter: `blur(${blur}px)`,
            transform: `scale(${scale})`
        }}>
            {children}
        </div>
    );
};

export const CinematicComposition = ({ processedPhotos, mood, eventName }) => {
    const { fps } = useVideoConfig();

    return (
        <div style={{
            flex: 1,
            backgroundColor: '#050505',
            position: 'relative',
            fontFamily: '"Inter", sans-serif'
        }}>
            {processedPhotos.map((slide, index) => {
                const durationInFrames = Math.floor(slide.duration * fps);

                // Calculate start time with overlap logic:
                let startTime = 0;
                for (let i = 0; i < index; i++) {
                    startTime += Math.floor(processedPhotos[i].duration * fps) - TRANSITION_DURATION;
                }

                // Ensure we don't start before 0
                startTime = Math.max(0, startTime);

                return (
                    <Sequence
                        key={slide.id}
                        from={startTime}
                        durationInFrames={durationInFrames + TRANSITION_DURATION}
                        layout="none"
                    >
                        <SlideContainer index={index}>
                            {slide.type === 'split' ? (
                                <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                    <KenBurns src={slide.photos[0].url} motion={slide.photos[0].motion} />
                                    <KenBurns src={slide.photos[1].url} motion={slide.photos[1].motion} />
                                </div>
                            ) : (
                                <KenBurns src={slide.photos[0].url} motion={slide.photos[0].motion} />
                            )}
                        </SlideContainer>
                    </Sequence>
                );
            })}

            {/* Professional Overlays */}
            <Letterbox />
            <ColorGradeOverlay />

            {mood && (
                <>
                    {/* Preserving mood-specific light leaks/glows if desired, but cleaned up */}
                    {mood.lightLeak && <LightLeakOverlay />}
                    {mood.softGlow && <SoftGlow />}
                </>
            )}

            <TextOverlay title={eventName || "Cinematic Memory"} />
            {mood && mood.music && <Audio src={mood.music.url} volume={0.5} />}
        </div>
    );
};
