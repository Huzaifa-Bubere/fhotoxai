import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Footer = ({ style, className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're not on the main page
  const isNotMainPage = location.pathname !== '/';

  const handleNavigation = (e, sectionId) => {
    e.preventDefault();

    if (isNotMainPage) {
      // If we're not on the main page, navigate to main with the section hash
      navigate(`/${sectionId !== 'home' ? '#' + sectionId : ''}`);
    } else {
      // If we're already on the main page, just scroll to the section
      const section = document.getElementById(sectionId);
      if (section) {
        window.scrollTo({
          top: section.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <footer className={className} style={{
      background: '#172554',
      borderTop: '1px solid #1E3A8A',
      padding: '2rem 0 1.5rem',
      marginTop: 'auto',
      zIndex: 10,
      position: 'relative',
      fontSize: '0.85rem',
      ...style
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Brand Column */}
          <div>
            <div style={{ color: '#F8FAFC', fontWeight: '700', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/photocluster-logo.png" alt="" width="44" height="44" style={{ objectFit: 'contain' }} />
              <span>PhotoCluster AI</span>
            </div>
            <p style={{ color: '#BFDBFE', maxWidth: '300px', lineHeight: '1.5', margin: 0 }}>
              Private event galleries with fast AI photo matching for organizers, photographers, and guests.
            </p>
          </div>

          {/* Platform */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#93C5FD', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</div>
            <a href="/dashboard" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Dashboard</a>
            <a href="/" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Home</a>
            <a href="/photos" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Photo Stream</a>
          </div>

          {/* Resources */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#93C5FD', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</div>
            <a href="/docs" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Documentation</a>
            <a href="/api" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>API Reference</a>
            <a href="/status" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>System Status</a>
          </div>

          {/* Legal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#93C5FD', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal</div>
            <a href="/privacy" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Privacy</a>
            <a href="/terms" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Terms</a>
            <a href="/security" style={{ color: '#DBEAFE', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#DBEAFE'}>Security</a>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #1E3A8A',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#BFDBFE' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#4ADE80', borderRadius: '50%', marginRight: '6px' }}></span>
            All systems operational
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#93C5FD' }}>
            <span>© 2026 Zummit DNA Group. All rights reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
