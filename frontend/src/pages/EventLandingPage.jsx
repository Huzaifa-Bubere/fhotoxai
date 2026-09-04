import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CalendarDays,
    Camera,
    Images,
    ShieldCheck,
    Sparkles,
    UsersRound,
} from 'lucide-react';
import heroImage from '../assets/hero-camera-3d.png';
import './eventLanding.css';

const portalLinks = [
    {
        title: 'Organizer Console',
        description: 'Create events, manage photographers, and monitor clustering progress.',
        path: '/organizer/events',
        icon: CalendarDays,
        accent: 'organizer',
    },
    {
        title: 'Photographer Console',
        description: 'Upload assigned event photos and keep delivery pipelines moving.',
        path: '/photographer/login',
        icon: Camera,
        accent: 'photographer',
    },
    {
        title: 'Attendee Access',
        description: 'Verify access and open personal event galleries without organizer permissions.',
        path: '/attendee/access',
        icon: UsersRound,
        accent: 'attendee',
    },
];

const steps = [
    {
        number: '01',
        title: 'Create the event',
        description: 'Set up the event once, then invite photographers and attendees into the same workflow.',
    },
    {
        number: '02',
        title: 'Collect the photos',
        description: 'Photographers upload folders while the system keeps ingestion organized in the background.',
    },
    {
        number: '03',
        title: 'Run AI clustering',
        description: 'Face clustering and matching reduce manual sorting and prepare galleries faster.',
    },
    {
        number: '04',
        title: 'Deliver the memories',
        description: 'Attendees verify access and open the photos that belong to them.',
    },
];

const capabilities = [
    {
        title: 'Facial Intelligence',
        description: 'Identify guests across large event albums with clustering and face-driven retrieval.',
        icon: Images,
    },
    {
        title: 'Privacy Core',
        description: 'Access stays role-based, with attendee flows separated from organizer controls.',
        icon: ShieldCheck,
    },
    {
        title: 'Low-Friction Uploads',
        description: 'Photographers move fast with a direct console and event-specific upload paths.',
        icon: Camera,
    },
    {
        title: 'Fast Distribution',
        description: 'Once photos are processed, attendee access becomes the final delivery layer.',
        icon: Sparkles,
    },
];

function EventLandingPage() {
    const navigate = useNavigate();

    return (
        <div className="event-landing-page">
            <div className="event-landing-glow event-landing-glow-left" />
            <div className="event-landing-glow event-landing-glow-right" />

            <div className="event-landing-shell">
                <section className="event-landing-hero">
                    <div className="event-landing-copy">
                        <span className="event-landing-eyebrow">Public Event Hub</span>
                        <h1>Run event photography without the manual chaos.</h1>
                        <p>
                            EventLens connects event setup, photographer uploads, AI clustering, and attendee access in
                            one clean pipeline.
                        </p>

                        <div className="event-landing-actions">
                            <button
                                type="button"
                                className="event-landing-button event-landing-button-primary"
                                onClick={() => navigate('/event-registration')}
                            >
                                Start Registration
                                <ArrowRight size={18} strokeWidth={2.1} />
                            </button>
                            <button
                                type="button"
                                className="event-landing-button event-landing-button-secondary"
                                onClick={() => navigate('/')}
                            >
                                Back Home
                            </button>
                        </div>

                        <div className="event-landing-stats" aria-label="Event summary">
                            <div className="event-landing-stat">
                                <span className="event-landing-stat__value">3</span>
                                <span className="event-landing-stat__label">role portals</span>
                            </div>
                            <div className="event-landing-stat">
                                <span className="event-landing-stat__value">AI</span>
                                <span className="event-landing-stat__label">photo matching</span>
                            </div>
                            <div className="event-landing-stat">
                                <span className="event-landing-stat__value">1</span>
                                <span className="event-landing-stat__label">shared event workflow</span>
                            </div>
                        </div>
                    </div>

                    <div className="event-landing-visual">
                        <div className="event-landing-visual__frame">
                            <img src={heroImage} alt="EventLens camera visualization" />
                        </div>
                        <div className="event-landing-visual__badge">
                            <Sparkles size={16} strokeWidth={2.2} />
                            AI clustering ready
                        </div>
                    </div>
                </section>

                <section className="event-landing-section">
                    <div className="event-landing-section__heading">
                        <div>
                            <span className="event-landing-section__kicker">Role Access</span>
                            <h2>Jump into the right event console.</h2>
                        </div>
                    </div>

                    <div className="event-landing-portal-grid">
                        {portalLinks.map((portal) => {
                            const Icon = portal.icon;

                            return (
                                <button
                                    key={portal.title}
                                    type="button"
                                    className={`event-landing-portal-card event-landing-portal-card-${portal.accent}`}
                                    onClick={() => navigate(portal.path)}
                                >
                                    <div className="event-landing-portal-card__icon" aria-hidden="true">
                                        <Icon size={22} strokeWidth={2} />
                                    </div>
                                    <div className="event-landing-portal-card__body">
                                        <h3>{portal.title}</h3>
                                        <p>{portal.description}</p>
                                    </div>
                                    <span className="event-landing-portal-card__action">
                                        Open console
                                        <ArrowRight size={16} strokeWidth={2.2} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="event-landing-section">
                    <div className="event-landing-section__heading">
                        <div>
                            <span className="event-landing-section__kicker">Workflow</span>
                            <h2>How the event pipeline works.</h2>
                        </div>
                    </div>

                    <div className="event-landing-step-grid">
                        {steps.map((step) => (
                            <article key={step.number} className="event-landing-step-card">
                                <span className="event-landing-step-card__number">{step.number}</span>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="event-landing-section">
                    <div className="event-landing-section__heading">
                        <div>
                            <span className="event-landing-section__kicker">Capabilities</span>
                            <h2>Built for event photography, not generic demo visuals.</h2>
                        </div>
                    </div>

                    <div className="event-landing-capability-grid">
                        {capabilities.map((capability) => {
                            const Icon = capability.icon;

                            return (
                                <article key={capability.title} className="event-landing-capability-card">
                                    <div className="event-landing-capability-card__icon" aria-hidden="true">
                                        <Icon size={20} strokeWidth={2} />
                                    </div>
                                    <h3>{capability.title}</h3>
                                    <p>{capability.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default EventLandingPage;
