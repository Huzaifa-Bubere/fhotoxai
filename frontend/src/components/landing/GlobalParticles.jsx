import React, { useRef, useEffect } from 'react';

const GlobalParticles = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        // Configuration
        const particleCount = 200;
        const perspective = 800;
        const speed = 0.5; // Slower drift
        // DARKER COLOR for visibility on White Background
        const color = 'rgba(0, 120, 150, 0.9)'; // Darker, more opaque cyan

        // Mouse State
        let mouseX = 0;
        let mouseY = 0;
        let targetMouseX = 0;
        let targetMouseY = 0;

        // Resize canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            centerX = canvas.width / 2;
            centerY = canvas.height / 2;
        };

        let centerX = window.innerWidth / 2;
        let centerY = window.innerHeight / 2;

        const handleMouseMove = (e) => {
            // Normalize mouse (-1 to 1)
            targetMouseX = (e.clientX - centerX) / centerX;
            targetMouseY = (e.clientY - centerY) / centerY;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        resize();

        // Particle class representing a point in 3D space
        class Particle3D {
            constructor() {
                this.reset(true);
            }

            reset(randomZ = false) {
                // Random position in 3D space relative to center
                // Range: -3000 to 3000 for X and Y covers wider field
                this.x = (Math.random() - 0.5) * 4000;
                this.y = (Math.random() - 0.5) * 4000;

                // Z: 0 is camera, larger is further away
                this.z = randomZ ? Math.random() * 2000 : 2000;

                this.size = Math.random() * 4 + 2; // Much Larger particles (2-6px)
                this.opacity = Math.random() * 0.4 + 0.6; // Higher minimum opacity (0.6-1.0)

                // Add base drift so it moves without mouse
                this.baseVx = (Math.random() - 0.5) * 2;
                this.baseVy = (Math.random() - 0.5) * 2;
            }

            update() {
                // Move towards camera
                this.z -= speed;

                // Intrinsic Movement (Always moving)
                this.x += this.baseVx;
                this.y += this.baseVy;

                // Mouse Interaction: "Antigravity" Parallax / Sway
                // HUGE multiplier for obvious effect
                this.x += (mouseX * 150);
                this.y += (mouseY * 150);

                // If behind camera, reset to back
                if (this.z <= 0) {
                    this.reset(false);
                    // Respread x/y to avoid clumping
                    this.x = (Math.random() - 0.5) * 4000;
                    this.y = (Math.random() - 0.5) * 4000;
                }
            }

            draw() {
                if (this.z <= 0) return;

                const scale = perspective / this.z;
                const screenX = centerX + this.x * scale;
                const screenY = centerY + this.y * scale;

                // Optimization: Skip off-screen rendering
                if (screenX < -50 || screenX > canvas.width + 50 ||
                    screenY < -50 || screenY > canvas.height + 50) return;

                const screenRadius = this.size * scale;
                const depthAlpha = 1 - (this.z / 2000);

                if (depthAlpha > 0) {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);

                    // Simple opacity calculation
                    ctx.fillStyle = color.replace('0.9', (this.opacity * depthAlpha).toFixed(2));
                    ctx.fill();
                }
            }
        }

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle3D());
        }

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Standard clear

            // Smooth mouse interpolation (Ease-out)
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="global-particles"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999, // Force ON TOP
                mixBlendMode: 'multiply' // Good for dark particles on white bg
            }}
        />
    );
};

export default GlobalParticles;
