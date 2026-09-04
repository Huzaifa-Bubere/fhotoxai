import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
// Sidebar removed

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on wider screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="layout">
      {/* Sidebar component */}
      {/* Sidebar removed */}

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-container">
            <div className="header-title">
              <h1>Event Management Company</h1>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        <footer>
          <div className="container">
            <p className="copyright">Event Management Company Reference</p>
            <p className="attribution">© 2026 • Zummit DNA Group</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;