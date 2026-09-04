import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Award,
    Building2,
    Cake,
    Camera,
    CalendarPlus2,
    ChevronDown,
    Download,
    Facebook,
    GraduationCap,
    HandHeart,
    Heart,
    Image as ImageIcon,
    Instagram,
    Linkedin,
    Link2,
    Mail,
    MapPin,
    Plus,
    ScanFace,
    ShieldCheck,
    Sparkles,
    Users,
    Youtube,
} from 'lucide-react';
import heroBackdrop from '../assets/hero-abstract.jpg';
import heroCamera from '../assets/hero-camera-3d.png';
import './landing-photo.css';

const scaleCards = [
    { icon: Cake, title: 'Birthdays', desc: 'From party to polished memories in minutes, without manual sorting.' },
    { icon: HandHeart, title: 'Social Gatherings', desc: 'Give every friend easy access to the moments where they actually appear.' },
    { icon: Building2, title: 'Corporate Events', desc: 'Keep large galleries organized, secure, and ready for fast attendee delivery.' },
    { icon: Heart, title: 'Weddings', desc: 'Relive the day with private galleries that feel personal and effortless to browse.' },
    { icon: GraduationCap, title: 'Convocations', desc: 'Help every graduate and family member discover milestone moments quickly.' },
    { icon: Award, title: 'Award Ceremonies', desc: 'Capture every winner and publish curated memories while the event is still buzzing.' },
];

const orangeCards = [
    { icon: ImageIcon, title: 'Turn Moments into Memories', desc: 'Bring capture, matching, and delivery into one event-ready workflow.' },
    { icon: ScanFace, title: 'AI Face Verification', desc: 'Fast, secure matching helps guests find their own photos in seconds.' },
    { icon: ShieldCheck, title: 'Private by Default', desc: 'Role-based access keeps organizer controls, uploads, and attendee galleries separated.' },
];

const actionButtons = [
    { icon: CalendarPlus2, label: 'Organizer Login', path: '/organizer/login', style: 'primary' },
    { icon: Camera, label: 'Photographer Login', path: '/photographer/login' },
    { icon: Users, label: 'Attendee Access', path: '/attendee/access' },
    { icon: Plus, label: 'Create Event', path: '/event-registration' },
];

const guestFlow = [
    { icon: Link2, title: 'Open Event Link', desc: 'A private link or QR code gets shared through WhatsApp, email, or event screens.' },
    { icon: ScanFace, title: 'One Selfie, Instant Photo Match', desc: 'Guests upload one selfie so the system can find the photos that include them.' },
    { icon: Users, title: 'Photos, Instantly Matched', desc: 'Face clustering narrows large galleries down to the moments that matter to each guest.' },
    { icon: Download, title: 'Download in Seconds', desc: 'Guests can review, save, and share their matched photos without waiting for manual sorting.' },
];

const roleCards = [
    {
        icon: CalendarPlus2,
        title: 'Organizer Portal',
        desc: 'Create events, manage access, monitor clustering, and control delivery from one dashboard.',
        path: '/organizer/login',
        cta: 'Organizer Login',
    },
    {
        icon: Camera,
        title: 'Photographer Portal',
        desc: 'Upload event coverage quickly and keep the AI pipeline moving while the event is still live.',
        path: '/photographer/login',
        cta: 'Photographer Login',
    },
    {
        icon: Users,
        title: 'Attendee Access',
        desc: 'Guests can verify identity, open their gallery, and download their matched photos on demand.',
        path: '/attendee/access',
        cta: 'Guest Access',
    },
];

const testimonials = [
    {
        name: 'Sharukhan',
        role: 'Event Organizer, Hyderabad',
        quote: 'Managing event photos felt calm for the first time. Guests found their pictures instantly and our team stopped chasing manual requests.',
        initial: 'S',
    },
    {
        name: 'Adrian',
        role: 'Corporate Event Lead, Bengaluru',
        quote: 'The delivery flow was smooth and secure. Employees could access their event memories without digging through giant shared folders.',
        initial: 'A',
    },
    {
        name: 'Mithul',
        role: 'Wedding Coordinator, Tamil Nadu',
        quote: 'Families discovered the right photos quickly and the whole sharing experience felt premium instead of chaotic.',
        initial: 'M',
    },
];

const faqs = [
    {
        question: 'How accurate is the face matching?',
        answer: 'The platform uses the event registration selfie and clustering workflow to improve match quality while still giving organizers review controls.',
    },
    {
        question: 'Can guests see their photos instantly?',
        answer: 'Yes. Once uploads are processed, attendees can verify access and open their matched gallery from the attendee flow.',
    },
    {
        question: 'How does it find the right photos?',
        answer: 'It compares face embeddings from uploaded event images against attendee registration data to surface relevant matches.',
    },
    {
        question: 'Does this support multiple event roles?',
        answer: 'Yes. Organizer, photographer, and attendee experiences are separated so each role gets only the tools they need.',
    },
    {
        question: 'Can photographers upload during the event?',
        answer: 'Yes. The photographer portal is designed for live or batch uploads so delivery can begin while the event is active.',
    },
    {
        question: 'Is attendee access private?',
        answer: 'Yes. Guests access their own event gallery through verification-based flows rather than a public shared folder.',
    },
];

const socialIcons = [Facebook, Linkedin, Youtube, Instagram];

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="photo-landing">
            <section className="landing-hero" id="top">
                <div className="landing-hero-media" style={{ backgroundImage: `url(${heroBackdrop})` }} />
                <div className="landing-hero-overlay" />
                <div className="landing-grid-pattern" />

                <header className="landing-hero-header">
                    <a className="brand-wrap" href="#top" aria-label="PhotoCluster AI home">
                        <div className="brand-logo">PC</div>
                        <div className="brand-copy">
                            <span className="brand-name">PhotoCluster AI</span>
                            <span className="brand-tag">Event photo delivery</span>
                        </div>
                    </a>

                    <nav className="landing-hero-nav" aria-label="Landing page sections">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How it works</a>
                        <a href="#roles">Portals</a>
                        <a href="#testimonials">Testimonials</a>
                        <a href="#faq">FAQs</a>
                        <a href="#contact">Contact Us</a>
                    </nav>

                    <button
                        type="button"
                        className="cta-ghost header-cta"
                        onClick={() => navigate('/organizer/login')}
                    >
                        Organizer Login
                    </button>
                </header>

                <div className="landing-hero-content">
                    <div className="landing-hero-copy">
                        <span className="landing-eyebrow">
                            <Sparkles size={16} />
                             event photo sharing
                        </span>

                        <h1>One upload transforms every moment into lasting memories.</h1>

                        <p>
                            Bring organizers, photographers, and attendees into one flow where photos are uploaded once,
                            matched automatically, and delivered through private event galleries.
                        </p>

                        <div className="landing-hero-actions">
                            <button
                                type="button"
                                className="cta-primary"
                                onClick={() => navigate('/organizer/login')}
                            >
                                Organizer Login
                                <ArrowRight size={18} />
                            </button>
                            <button
                                type="button"
                                className="cta-secondary"
                                onClick={() => navigate('/photographer/login')}
                            >
                                Photographer Login
                            </button>
                            <button
                                type="button"
                                className="cta-ghost"
                                onClick={() => navigate('/attendee/access')}
                            >
                                Attendee Access
                            </button>
                        </div>

                        <div className="landing-hero-bottom-row">
                            <div className="landing-stat-strip" aria-label="Product stats">
                                <div className="landing-stat">
                                    <strong>12k+</strong>
                                    <span>photos indexed</span>
                                </div>
                                <div className="landing-stat">
                                    <strong>98.7%</strong>
                                    <span>match confidence</span>
                                </div>
                                <div className="landing-stat">
                                    <strong>3 roles</strong>
                                    <span>one platform</span>
                                </div>
                            </div>

                            <div className="landing-hero-socials" aria-hidden="true">
                                {socialIcons.map((Icon, index) => (
                                    <span key={index} className="landing-social-chip">
                                        <Icon size={16} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="landing-hero-visual">
                        <div className="hero-visual-card">
                            <div className="hero-visual-chip">Live match engine</div>
                            <img src={heroCamera} alt="Abstract camera illustration" />

                            <div className="hero-visual-metrics">
                                <div>
                                    <span className="metric-label">Organizer</span>
                                    <strong>Event setup</strong>
                                </div>
                                <div>
                                    <span className="metric-label">Photographer</span>
                                    <strong>Upload flow</strong>
                                </div>
                                <div>
                                    <span className="metric-label">Attendee</span>
                                    <strong>Private gallery</strong>
                                </div>
                            </div>
                        </div>

                        <div className="hero-floating-card hero-floating-card-top">
                            <span className="floating-label">Fast delivery</span>
                            <strong>Share galleries while the event is still active.</strong>
                        </div>

                        <div className="hero-floating-card hero-floating-card-bottom">
                            <span className="floating-label">Access ready</span>
                            <strong>Organizer, photographer, and attendee routes are all one tap away.</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section section-light" id="features">
                <div className="section-shell">
                    <span className="section-kicker">Made for every celebration</span>
                    <h2 className="section-title section-title-wide">Designed for events of every shape and size.</h2>
                    <p className="section-copy">
                        The landing flow from the older design is back here, now mapped to the current portals and event actions in this branch.
                    </p>

                    <div className="scale-grid">
                        {scaleCards.map(({ icon: Icon, title, desc }) => (
                            <article className="scale-card" key={title}>
                                <span className="scale-icon-wrap">
                                    <Icon className="scale-icon" size={22} />
                                </span>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </article>
                        ))}
                    </div>

                    <div className="action-row" aria-label="Primary product actions">
                        {actionButtons.map(({ icon: Icon, label, path, style }) => (
                            <button
                                key={label}
                                type="button"
                                className={`action-btn${style === 'primary' ? ' action-btn-primary' : ''}`}
                                onClick={() => navigate(path)}
                            >
                                <Icon size={18} />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="setup-grid">
                        <div className="setup-image-box">
                            <div className="setup-visual-surface">
                                <div className="setup-visual-chip">Event setup</div>
                                <img src={heroCamera} alt="Camera visual for event workflow" />
                                <div className="setup-visual-caption">
                                    One event page can coordinate setup, upload, access, and attendee delivery.
                                </div>
                            </div>
                            <h3>Set up your event in minutes.</h3>
                            <p>Launch the event flow quickly, then hand photographers and attendees the right links without extra ops overhead.</p>
                        </div>

                        <form className="event-form" onSubmit={(event) => event.preventDefault()}>
                            <div className="event-form-heading">
                                <span className="section-kicker">Quick setup preview</span>
                                <h3>Event essentials</h3>
                                <p>Mirror the creation flow before moving into the full organizer experience.</p>
                            </div>

                            <label>
                                Event Name
                                <input type="text" placeholder="Spring convocation 2026" />
                            </label>
                            <label>
                                Date
                                <input type="date" />
                            </label>
                            <label>
                                Time
                                <input type="time" />
                            </label>
                            <label>
                                Venue / Location
                                <input type="text" placeholder="Convention Hall, Hyderabad" />
                            </label>
                            <label>
                                Occasion Type
                                <select defaultValue="">
                                    <option value="" disabled>Select an event type</option>
                                    <option>Wedding</option>
                                    <option>Corporate Event</option>
                                    <option>Birthday</option>
                                    <option>Convocation</option>
                                    <option>Award Ceremony</option>
                                </select>
                            </label>

                            <button
                                type="button"
                                className="cta-primary event-form-submit"
                                onClick={() => navigate('/organizer/login')}
                            >
                                Continue to Organizer Login
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <section className="section section-orange">
                <div className="section-shell">
                    <span className="section-kicker section-kicker-light">Platform highlights</span>
                    <h2 className="section-title section-title-light section-title-wide">The ultimate event photo sharing experience.</h2>

                    <div className="orange-grid">
                        {orangeCards.map(({ icon: Icon, title, desc }) => (
                            <article className="orange-card" key={title}>
                                <Icon size={22} />
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-light" id="how-it-works">
                <div className="section-shell">
                    <span className="section-kicker">Guest journey</span>
                    <h2 className="section-title section-title-wide">How guests get their photos.</h2>

                    <div className="flow-grid">
                        {guestFlow.map(({ icon: Icon, title, desc }) => (
                            <article className="flow-card" key={title}>
                                <span className="flow-step-icon">
                                    <Icon size={22} />
                                </span>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-light section-tinted" id="roles">
                <div className="section-shell">
                    <span className="section-kicker">Access by role</span>
                    <h2 className="section-title section-title-wide">Three entry points, one connected workflow.</h2>
                    <p className="section-copy">
                        This keeps the marketing-style landing page while preserving the real route structure already used by the app.
                    </p>

                    <div className="role-grid">
                        {roleCards.map(({ icon: Icon, title, desc, path, cta }) => (
                            <article className="role-card" key={title}>
                                <span className="role-card-icon">
                                    <Icon size={22} />
                                </span>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                                <button type="button" className="role-card-link" onClick={() => navigate(path)}>
                                    {cta}
                                    <ArrowRight size={17} />
                                </button>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-light" id="testimonials">
                <div className="section-shell">
                    <span className="section-kicker">Social proof</span>
                    <h2 className="section-title">Hear from our users.</h2>

                    <div className="testimonial-grid">
                        {testimonials.map((item) => (
                            <article className="testimonial" key={item.name}>
                                <div className="testimonial-avatar" aria-hidden="true">{item.initial}</div>
                                <h3>{item.name}</h3>
                                <p className="testimonial-role">{item.role}</p>
                                <div className="testimonial-stars" aria-label="4 out of 5 stars">
                                    4 / 5
                                </div>
                                <p className="testimonial-quote">{item.quote}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-orange" id="faq">
                <div className="section-shell">
                    <span className="section-kicker section-kicker-light">Common questions</span>
                    <h2 className="section-title section-title-light section-title-wide">Frequently asked questions.</h2>

                    <div className="faq-grid">
                        {faqs.map(({ question, answer }) => (
                            <details key={question} className="faq-item">
                                <summary>
                                    <span>{question}</span>
                                    <ChevronDown size={18} />
                                </summary>
                                <p>{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-light" id="contact">
                <div className="section-shell">
                    <span className="section-kicker">Contact us</span>
                    <h2 className="section-title section-title-wide">Let&apos;s plan the event workflow together.</h2>

                    <div className="contact-grid">
                        <div className="contact-visual">
                            <div className="contact-visual-surface">
                                <div className="contact-badge">PhotoCluster AI</div>
                                <img src={heroBackdrop} alt="Abstract event background" />
                            </div>

                            <div className="contact-points">
                                <div className="contact-point">
                                    <Mail size={18} />
                                    <div>
                                        <strong>Support-ready rollout</strong>
                                        <span>Organizer onboarding, attendee flow, and portal guidance.</span>
                                    </div>
                                </div>
                                <div className="contact-point">
                                    <MapPin size={18} />
                                    <div>
                                        <strong>Built for live events</strong>
                                        <span>Keep uploads and gallery delivery moving while the venue is still active.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
                            <h3>Get in touch</h3>
                            <p>Tell us about your event and we&apos;ll help you map the right flow.</p>

                            <label>
                                Name
                                <input type="text" placeholder="Your full name" />
                            </label>
                            <label>
                                Your email
                                <input type="email" placeholder="you@example.com" />
                            </label>
                            <label>
                                Your message
                                <textarea rows="5" placeholder="Tell us about your event size, team, and delivery goals." />
                            </label>

                            <div className="contact-form-actions">
                                <button type="submit" className="cta-primary">Request Demo</button>
                                <button
                                    type="button"
                                    className="cta-secondary"
                                    onClick={() => navigate('/organizer/register')}
                                >
                                    Create Organizer Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="section-shell footer-grid">
                    <div className="footer-brand-block">
                        <div className="footer-brand-mark">PC</div>
                        <p>Smart AI photo sharing for events, with secure attendee access and role-aware delivery.</p>
                        <div className="footer-socials" aria-hidden="true">
                            {socialIcons.map((Icon, index) => (
                                <span key={index} className="footer-social-chip">
                                    <Icon size={15} />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4>For Organizers</h4>
                        <button type="button" className="footer-link" onClick={() => navigate('/event-registration')}>Create Event</button>
                        <button type="button" className="footer-link" onClick={() => navigate('/organizer/login')}>Organizer Login</button>
                        <button type="button" className="footer-link" onClick={() => navigate('/organizer/register')}>Organizer Register</button>
                    </div>

                    <div>
                        <h4>Quick Links</h4>
                        <a className="footer-link" href="#how-it-works">How It Works</a>
                        <a className="footer-link" href="#roles">Portals</a>
                        <a className="footer-link" href="#contact">Contact Us</a>
                    </div>

                    <div>
                        <h4>Support</h4>
                        <button type="button" className="footer-link" onClick={() => navigate('/photographer/login')}>Photographer Login</button>
                        <button type="button" className="footer-link" onClick={() => navigate('/attendee/access')}>Attendee Access</button>
                        <button type="button" className="footer-link" onClick={() => navigate('/clustering-demo')}>Clustering Demo</button>
                    </div>
                </div>
            </footer>

            <div className="copyright">
                <span>Copyright 2026 PhotoCluster AI. All rights reserved worldwide.</span>
                <span>Built for organizers, photographers, and attendees.</span>
            </div>
        </div>
    );
}

export default LandingPage;
