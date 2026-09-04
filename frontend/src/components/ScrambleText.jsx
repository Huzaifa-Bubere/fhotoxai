import React, { useState, useEffect, useRef } from 'react';

const ScrambleText = ({ text, className = "", delay = 0 }) => {
    const [displayText, setDisplayText] = useState(text);
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef(null);
    const intervalRef = useRef(null);

    // Character set for "data" look
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) observer.observe(elementRef.current);

        return () => observer.disconnect();
    }, [delay]);

    useEffect(() => {
        if (!isVisible) return;

        let frame = 0;
        const totalFrames = 30; // Duration of scramble
        const originalText = text;

        intervalRef.current = setInterval(() => {
            let result = "";
            for (let i = 0; i < originalText.length; i++) {
                if (originalText[i] === " ") {
                    result += " ";
                    continue;
                }

                // Once we pass a certain frame, lock the character
                // Reveal from left to right gradually
                const progress = frame / totalFrames;
                const charProgress = i / originalText.length;

                if (progress >= 1 || progress > charProgress + 0.2) {
                    result += originalText[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }

            setDisplayText(result);
            frame++;

            if (frame > totalFrames + 10) { // Slight buffer
                setDisplayText(originalText);
                clearInterval(intervalRef.current);
            }
        }, 50); // Speed of character cycling

        return () => clearInterval(intervalRef.current);
    }, [isVisible, text]);

    return (
        <span ref={elementRef} className={className} style={{ fontFamily: 'monospace' }}>
            {displayText}
        </span>
    );
};

export default ScrambleText;
