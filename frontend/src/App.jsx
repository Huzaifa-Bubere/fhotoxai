import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layout
import Navbar from './components/layout/NavbarNew';

// Pages
import SingleEventLanding from './pages/SingleEventLanding';
import LandingPage from './pages/LandingPage';
import EventRegistration from './pages/EventRegistration';
import AttendeeRegistration from './pages/AttendeeRegistration';
import AttendeeAccess from './pages/AttendeeAccess';
import AttendeeWelcome from './pages/AttendeeWelcome';
import AttendeeDashboard from './pages/AttendeeDashboard';
import AttendeeEventUpload from './pages/AttendeeEventUpload';
import PhotoUpload from './pages/PhotoUpload';
import Dashboard from './pages/Dashboard';
import ModelsPage from './pages/ModelsPage';
import AttendancePage from './pages/AttendancePage';
import PhotoClusteringPage from './pages/PhotoClusteringPage';
import OrganizerLogin from './pages/OrganizerLogin';
import OrganizerRegister from './pages/OrganizerRegister';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEventsPage from './pages/OrganizerEventsPage';
import AddPhotographer from './pages/AddPhotographer';
import ClusterGrid from './components/photoClustering/ui/ClusterGrid'; // Added route
import ClusterViewer from './components/photoClustering/ui/ClusterViewer';
import PhotographerLogin from './pages/PhotographerLogin';
import PhotographerRegister from './pages/PhotographerRegister';
import PhotographerDashboard from './pages/PhotographerDashboard';
import PhotographerEventPage from './pages/PhotographerEventPage';
import ClusteringDemoPage from './pages/ClusteringDemoPage';
import { AUTH_EXPIRED_EVENT } from './services/api';

function AppLayout({ children, isLanding, className, showNavbar = true }) {
  // Navbar is always visible unless showNavbar is false.
  // We use isLanding ONLY to adjust the main container's padding/width constrains.
  return (
    <div className="app">
      {showNavbar && <Navbar />}
      <main className={`main-content ${isLanding ? 'landing-mode' : ''} ${className || ''}`} style={{ paddingTop: showNavbar ? '70px' : '0' }}>
        <AnimatePresence>
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}



function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // Normalize path
  const path = location.pathname.endsWith('/') && location.pathname.length > 1
    ? location.pathname.slice(0, -1)
    : location.pathname;

  useEffect(() => {
    const handleAuthExpired = (event) => {
      const currentPath = location.pathname.endsWith('/') && location.pathname.length > 1
        ? location.pathname.slice(0, -1)
        : location.pathname;

      if (
        currentPath === '/organizer/login' ||
        currentPath === '/photographer/login' ||
        currentPath === '/attendee/login' ||
        currentPath === '/attendee/access'
      ) {
        return;
      }

      let loginPath = null;
      if (currentPath.startsWith('/photographer')) {
        loginPath = '/photographer/login';
      } else if (currentPath.startsWith('/attendee')) {
        loginPath = '/attendee/access';
      } else if (
        currentPath.startsWith('/organizer') ||
        currentPath === '/event-registration' ||
        currentPath === '/photo-clustering' ||
        currentPath.startsWith('/clusters') ||
        currentPath.startsWith('/cluster')
      ) {
        loginPath = '/organizer/login';
      }

      if (!loginPath) {
        return;
      }

      navigate(`${loginPath}?redirect=${encodeURIComponent(`${currentPath}${location.search || ''}`)}`, {
        replace: true,
        state: {
          authExpiredMessage: event?.detail?.message,
        },
      });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [location.pathname, location.search, navigate]);

  // Check if we are on a landing style page
  // Check if we are on a landing style page
  const isLanding = path === '/' || path === '/events' ||
    path === '/organizer/login' || path === '/organizer/register' ||
    path === '/organizer/events' ||

    path === '/event-registration' ||
    path === '/attendee/login' ||
    path === '/attendee/access' ||
    path === '/attendee-registration' ||
    path === '/photographer/login' ||
    path === '/photographer/register' ||
    path === '/clustering-demo' ||
    path === '/index.html' ||
    (path.includes('/event/') && !path.includes('/organizer/'));

  // Check if we are on a full-width app page (no padding, but sidebar pushes)
  const isNoPadding = !isLanding && (
    path.includes('/organizer') ||
    path.includes('/photographer') ||
    path.includes('/attendee') ||
    path.includes('/dashboard') ||
    path.includes('/cluster') ||
    path.includes('/attendance') ||
    path.includes('/photo-clustering') ||
    path === '/clustering-demo'
  );

  // Determine if Navbar should be shown
  const showNavbar =
    path !== '/' &&
    path !== '/index.html' &&
    path !== '/attendee/login' &&
    path !== '/attendee/access' &&
    !(path.includes('/event/') && !path.includes('/organizer/'));

  return (
    <AppLayout isLanding={isLanding} className={isNoPadding ? 'no-padding' : ''} showNavbar={showNavbar}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/index.html" element={<LandingPage />} />
        <Route path="/events" element={<Navigate to="/" replace />} />
        <Route path="/event/:eventId" element={<SingleEventLanding />} /> {/* New Event Landing Route */}
        <Route path="/clustering-demo" element={<ClusteringDemoPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/event-registration" element={<EventRegistration />} />
        <Route path="/attendee-registration" element={<AttendeeRegistration />} />
        <Route path="/attendee/login" element={<AttendeeAccess />} />
        <Route path="/attendee/access" element={<AttendeeAccess />} />
        <Route path="/attendee/welcome/:attendeeId" element={<AttendeeWelcome />} />
        <Route path="/attendee/:attendeeId/upload/:eventId" element={<AttendeeEventUpload />} />
        <Route path="/attendee/dashboard/:clusterId" element={<AttendeeDashboard />} />
        <Route path="/photo-upload" element={<PhotoUpload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/photo-clustering" element={<PhotoClusteringPage />} />

        {/* Organizer Routes */}
        {/* Organizer Routes */}
        <Route path="/organizer/login" element={<OrganizerLogin />} />
        <Route path="/organizer/register" element={<OrganizerRegister />} />
        <Route path="/organizer/events" element={<OrganizerEventsPage />} />
        <Route path="/organizer/add-photographer" element={<AddPhotographer />} />
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} /> {/* Fallback/Legacy */}
        <Route path="/organizer/event/:eventId/dashboard" element={<OrganizerDashboard />} />
        <Route path="/clusters/:eventId" element={<ClusterGrid />} /> {/* New Route */}
        <Route path="/cluster/:clusterId" element={<ClusterViewer />} />

        {/* Photographer Routes */}
        <Route path="/photographer/login" element={<PhotographerLogin />} />
        <Route path="/photographer/register" element={<PhotographerRegister />} />
        <Route path="/photographer/dashboard" element={<PhotographerDashboard />} />
        <Route path="/photographer/event/:eventId" element={<PhotographerEventPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
