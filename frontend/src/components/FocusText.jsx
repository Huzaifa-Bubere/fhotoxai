import React, { useState, useEffect, useRef } from 'react';

const FocusText = ({ text, className = "", delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef(null);

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

    return (
        <span
            ref={elementRef}
            className={className}
            style={{
                display: 'inline-block',
                transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Cinematic easing
                filter: isVisible ? 'blur(0)' : 'blur(8px)', // Blur in
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(5px) scale(0.95)',
                willChange: 'filter, opacity, transform'
            }}
        >
            {text}
        </span>
    );
};

export default FocusText;
