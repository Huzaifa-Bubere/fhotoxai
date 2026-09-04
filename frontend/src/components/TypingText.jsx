import React, { useState, useEffect, useRef } from 'react';

const TypingText = ({ text, delay = 0, speed = 50, className = "" }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [started, setStarted] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Start the delay timer only when visible
                    const timer = setTimeout(() => {
                        setStarted(true);
                    }, delay);
                    observer.unobserve(entry.target);
                    return () => clearTimeout(timer);
                }
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, [delay]);

    useEffect(() => {
        if (!started) return;

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [started, text, speed]);

    return (
        <span ref={elementRef} className={`${className} typing-text`}>
            {displayedText}
        </span>
    );
};

export default TypingText;
