import React, { useEffect, useRef } from 'react';

const CyberWaves = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        let increment = 0;

        // Colors tuned for White Background
        const waves = [
            {
                color: 'rgba(6, 182, 212, 0.5)', // Cyan-500 (Sharp)
                amplitude: 100,
                frequency: 0.005,
                speed: 0.01,
                offset: 0
            },
            {
                color: 'rgba(59, 130, 246, 0.3)', // Red/Blue-ish (Contrast) -> Blue-500
                amplitude: 150,
                frequency: 0.003,
                speed: 0.02,
                offset: 200
            },
            {
                color: 'rgba(14, 165, 233, 0.2)', // Sky-500 (Subtle fill)
                amplitude: 200,
                frequency: 0.002,
                speed: 0.005,
                offset: 400
            }
        ];

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            waves.forEach((wave, i) => {
                ctx.beginPath();

                // Create a flowing line
                for (let x = 0; x <= canvas.width; x++) {
                    const y = canvas.height / 2 +
                        Math.sin(x * wave.frequency + increment * (i + 1) + wave.offset) * wave.amplitude * Math.sin(increment * 0.5); // Pulse amplitude

                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.strokeStyle = wave.color;
                ctx.lineWidth = 2; // Thin, precise lines
                ctx.stroke();
            });

            increment += 0.01;
            animationFrameId = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
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
                pointerEvents: 'none',
                zIndex: 0, // Background
                // No mix-blend-mode needed for simple lines, keeps colors true
            }}
        />
    );
};

export default CyberWaves;
