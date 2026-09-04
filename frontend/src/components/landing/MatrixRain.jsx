import React, { useEffect, useRef } from 'react';

const MatrixRain = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Configuration
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = []; // Array of drops - one per column

        // Initialize drops at random y positions for natural start
        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100;
        }

        // Neo-Cyan Palette (Matches project theme)
        const colors = ['#0ee919ff', '#22D3EE', '#000000'];
        // We will use a gradient or just bright cyan

        const chars = "XYZ01010101AI_MODELS_VISION_ARCH_SYSTEM_DEPLOY_NEURAL_NET";
        const charArray = chars.split('');

        const draw = () => {
            // Translucent black background for trail effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // White fade for light theme
            // Actually, for a white background landing page, Matrix rain is tricky.
            // We need a subtle "Data Stream" look.

            // Let's stick to the Dark Theme or ensure this works on White.
            // The current landing page is Light/White themed based on previous context ("white background without blocking clicks").
            // "Matrix" usually needs dark bg.
            // Let's do "Digital Rain" in Cyan on White.

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Fade out previous frame
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Random char
                const text = charArray[Math.floor(Math.random() * charArray.length)];

                // Color: Dark Cyan for visibility on white
                ctx.fillStyle = '#0891b2'; // Cyan-600

                // Occasional "Glitch" color
                if (Math.random() > 0.98) ctx.fillStyle = '#0ea5e9'; // Sky-500

                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Reset drop to top randomly
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                // Move drop down
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 33);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Behind content but visible
                pointerEvents: 'none',
                opacity: 0.3 // Subtle but visible
            }}
        />
    );
};

export default MatrixRain;
