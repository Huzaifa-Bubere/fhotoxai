import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Camera, Home, Play, ChevronRight, Zap } from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Navigation Items
    const navItems = [
        { path: '/', label: 'Home', icon: Home },
    ];

    return (
        <header className={`navbar-fixed ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container">
                <div className="navbar-content">
                    {/* Logo Area */}
                    <div
                        className="navbar-brand"
                        onClick={() => navigate('/')}
                    >
                        <div className="brand-icon">
                            <Camera size={20} strokeWidth={2.5} color="white" />
                        </div>
                        <span className="brand-text">
                            EventLens
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="navbar-desktop-nav">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-link ${isActive ? 'active' : ''} ${item.primary ? 'primary-btn' : ''}`
                                }
                            >
                                {item.icon && <item.icon size={16} />}
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="navbar-mobile-toggle"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="navbar-mobile-menu"
                    >
                        <div className="mobile-menu-content">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? 'active' : ''} ${item.primary ? 'primary' : ''}`
                                    }
                                    onClick={() => setIsOpen(false)}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon && <item.icon size={20} />}
                                        {item.label}
                                    </div>
                                    <ChevronRight size={16} className="chevron" />
                                </NavLink>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>
                {`
                .navbar-fixed {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 50;
                    transition: all 0.3s ease;
                    height: 70px;
                    /* Distinguishable Style: Glassmorphism */
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(226, 232, 240, 0.8); /* Slate-200 */
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                
                .navbar-fixed.scrolled {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .navbar-container {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 0 1rem;
                    height: 100%;
                }

                .navbar-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 100%;
                }

                .navbar-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    user-select: none;
                }

                .brand-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(160deg, #ffd9b4, #f5821f);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 10px rgba(217, 109, 19, 0.3);
                }

                .brand-text {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #1f1f1f;
                    letter-spacing: -0.025em;
                    font-family: 'Sora', 'Segoe UI', sans-serif;
                }

                .navbar-desktop-nav {
                    display: none;
                    align-items: center;
                    gap: 0.5rem;
                }

                @media (min-width: 768px) {
                    .navbar-desktop-nav {
                        display: flex;
                    }
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #64748b;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .nav-link:hover {
                    color: #1e293b;
                    background: #f1f5f9;
                }

                .nav-link.active {
                    color: #d86d13;
                    background: #fff5eb;
                }

                .nav-link.primary-btn {
                    background: #1e293b;
                    color: white;
                    margin-left: 1rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .nav-link.primary-btn:hover {
                    background: #0f172a;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 10px -1px rgba(0, 0, 0, 0.15);
                }

                .navbar-mobile-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                @media (min-width: 768px) {
                    .navbar-mobile-toggle {
                        display: none;
                    }
                }

                .navbar-mobile-toggle:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                }

                .navbar-mobile-menu {
                    background: white;
                    border-bottom: 1px solid #f1f5f9;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                }

                .mobile-menu-content {
                    padding: 0.5rem 1rem 1.5rem 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .mobile-nav-link {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-radius: 0.75rem;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #64748b;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .mobile-nav-link:hover {
                    background: #f8fafc;
                    color: #1e293b;
                }

                .mobile-nav-link.active {
                    background: #fff5eb;
                    color: #d86d13;
                }

                .mobile-nav-link.primary {
                    background: #1e293b;
                    color: white;
                    margin-top: 1rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .mobile-nav-link .chevron {
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .mobile-nav-link:hover .chevron {
                    opacity: 1;
                }
                `}
            </style>
        </header>
    );
};

export default Navbar;
