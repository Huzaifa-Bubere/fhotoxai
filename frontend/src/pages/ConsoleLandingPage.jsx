import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CalendarDays,
    Camera,
    UsersRound,
} from 'lucide-react';
import './consoleLanding.css';

const portals = [
    {
        id: 'organizer',
        title: 'Organizer Portal',
        description: 'Manage events, monitor live ingestion, and review cluster analytics from one place.',
        path: '/organizer/login',
        label: 'Operations',
        tone: 'organizer',
        icon: CalendarDays,
        featured: true,
    },
    {
        id: 'photographer',
        title: 'Photographer Portal',
        description: 'Access assigned events, upload photos, and keep media delivery moving during the event.',
        path: '/photographer/login',
        label: 'Upload Flow',
        tone: 'photographer',
        icon: Camera,
    },
    {
        id: 'attendee',
        title: 'Attendee Portal',
        description: 'Sign in to view your event gallery, verify access, and continue into your personal photo space.',
        path: '/attendee/access',
        label: 'Guest Access',
        tone: 'attendee',
        icon: UsersRound,
    },
];

function ConsoleLandingPage() {
    const navigate = useNavigate();

    return (
        <div className="console-landing-page">
            <div className="console-landing-glow console-landing-glow-left" />
            <div className="console-landing-glow console-landing-glow-right" />

            <div className="console-landing-shell">
                <section className="console-hero">
                    <div className="console-landing-copy">
                        <span className="console-landing-eyebrow">Event Photography Console</span>
                        <h1>Choose your login console.</h1>
                        <p>
                            Start with the correct portal for your role, then move through the same event pipeline for
                            ingestion, clustering, review, and attendee delivery.
                        </p>

                        <div className="console-hero-actions">
                            <button
                                type="button"
                                className="console-hero-button console-hero-button-primary"
                                onClick={() => navigate('/organizer/login')}
                            >
                                Organizer Login
                                <ArrowRight size={18} strokeWidth={2.1} />
                            </button>
                            <button
                                type="button"
                                className="console-hero-button console-hero-button-secondary"
                                onClick={() => navigate('/organizer/register')}
                            >
                                Organizer Registration
                            </button>
                        </div>
                    </div>

                    <div className="console-portal-grid">
                        {portals.map((portal) => {
                            const Icon = portal.icon;

                            return (
                                <button
                                    key={portal.id}
                                    type="button"
                                    className={`console-portal-card console-portal-card-${portal.tone}${portal.featured ? ' is-featured' : ''}`}
                                    onClick={() => navigate(portal.path)}
                                >
                                    <div className="console-portal-card__header">
                                        <span className="console-portal-card__eyebrow">{portal.id}</span>
                                        <span className="console-portal-card__label">{portal.label}</span>
                                    </div>

                                    <div className="console-portal-card__body">
                                        <h2>{portal.title}</h2>
                                        <p>{portal.description}</p>
                                    </div>

                                    <div className="console-portal-card__footer">
                                        <div className="console-portal-card__icon" aria-hidden="true">
                                            <Icon size={28} strokeWidth={1.8} />
                                        </div>

                                        <span className="console-portal-card__action">
                                            Login to Console
                                            <ArrowRight size={18} strokeWidth={2.2} />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

            </div>
        </div>
    );
}

export default ConsoleLandingPage;
