import React, { useEffect, useRef } from 'react';

const HeroBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        window.addEventListener('resize', resize);
        resize();

        // Premium Dark Gradient Mesh (Deep Navy/Slate Base)
        // Using distinct "Glacier" colors: Cyan, Sky Blue, Deep Violet mixed with Slate
        const colors = [
            { r: 15, g: 23, b: 42 },   // Slate 900 (Base)
            { r: 8, g: 145, b: 178 },  // Cyan 600
            { r: 79, g: 70, b: 229 },  // Indigo 600
            { r: 15, g: 118, b: 110 }  // Teal 700 (Deep accent)
        ];

        let time = 0;

        const draw = () => {
            time += 0.002;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a rich mesh gradient
            const w = canvas.width;
            const h = canvas.height;

            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, '#1e293b'); // Slate 800 (Lighter base)
            gradient.addColorStop(1, '#334155'); // Slate 700 (Twilight)

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Add moving ambient orbs for depth (Brighter opacity)
            const orbs = [
                { x: w * 0.2, y: h * 0.3, r: h * 0.6, color: 'rgba(56, 189, 248, 0.20)' }, // Sky (brighter)
                { x: w * 0.8, y: h * 0.7, r: h * 0.5, color: 'rgba(99, 102, 241, 0.15)' }, // Indigo (brighter)
                { x: w * 0.5, y: h * 0.5, r: h * 0.4, color: 'rgba(20, 184, 166, 0.12)' } // Teal (brighter)
            ];

            orbs.forEach((orb, i) => {
                const floatX = Math.sin(time + i) * 50;
                const floatY = Math.cos(time + i * 0.5) * 50;

                const g = ctx.createRadialGradient(
                    orb.x + floatX, orb.y + floatY, 0,
                    orb.x + floatX, orb.y + floatY, orb.r
                );
                g.addColorStop(0, orb.color);
                g.addColorStop(1, 'transparent');

                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(orb.x + floatX, orb.y + floatY, orb.r, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="neural-background"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none'
            }}
        />
    );
};

export default HeroBackground;
