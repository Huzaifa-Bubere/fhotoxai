import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Camera,
    CheckCircle,
    Clock,
    Calendar,
    Building,
    User,
    Play,
    Pause,
    RotateCcw,
    FileText
} from 'lucide-react';

function AttendancePage() {
    const [demoState, setDemoState] = useState('idle'); // idle, scanning, recognized, logged
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const videoRef = useRef(null);

    const sampleEmployees = [
        { id: 'EMP001', name: 'John Smith', department: 'Engineering', checkIn: '08:45 AM', checkOut: '05:30 PM' },
        { id: 'EMP002', name: 'Sarah Johnson', department: 'Marketing', checkIn: '09:02 AM', checkOut: '06:15 PM' },
        { id: 'EMP003', name: 'Mike Chen', department: 'Operations', checkIn: '08:30 AM', checkOut: '05:45 PM' },
    ];

    const todayLogs = [
        { id: 'EMP001', name: 'John Smith', time: '08:45 AM', type: 'Check-in', location: 'Main Entrance' },
        { id: 'EMP002', name: 'Sarah Johnson', time: '09:02 AM', type: 'Check-in', location: 'Side Gate' },
        { id: 'EMP003', name: 'Mike Chen', time: '08:30 AM', type: 'Check-in', location: 'Main Entrance' },
        { id: 'EMP001', name: 'John Smith', time: '12:15 PM', type: 'Check-out', location: 'Cafeteria' },
        { id: 'EMP001', name: 'John Smith', time: '01:00 PM', type: 'Check-in', location: 'Cafeteria' },
    ];

    const runDemo = () => {
        setIsPlaying(true);
        setDemoState('scanning');

        setTimeout(() => {
            setDemoState('recognized');
            setCurrentEmployee(sampleEmployees[Math.floor(Math.random() * sampleEmployees.length)]);
        }, 2000);

        setTimeout(() => {
            setDemoState('logged');
        }, 3500);

        setTimeout(() => {
            setIsPlaying(false);
        }, 5000);
    };

    const resetDemo = () => {
        setDemoState('idle');
        setCurrentEmployee(null);
        setIsPlaying(false);
    };

    return (
        <motion.div
            className="page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="page-header">
                <motion.h1
                    className="page-title"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    Smart Attendance
                </motion.h1>
                <motion.p
                    className="page-description"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    Touchless facial recognition for automated employee check-in/check-out
                </motion.p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {/* Demo Camera View */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            background: 'var(--color-bg)',
                            padding: '1rem',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Camera size={18} style={{ color: 'var(--color-primary)' }} />
                                <span style={{ fontWeight: 600 }}>Entrance Camera</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.8rem',
                                color: demoState === 'idle' ? 'var(--color-text-dim)' : 'var(--color-primary)'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: demoState === 'idle' ? 'var(--color-border)' : 'var(--color-primary)',
                                    animation: demoState !== 'idle' ? 'pulse 1s infinite' : 'none'
                                }} />
                                {demoState === 'idle' ? 'Ready' : 'Live'}
                            </div>
                        </div>

                        <div style={{
                            aspectRatio: '4/3',
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16161d 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            {/* Simulated Camera Feed */}
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: 'var(--color-surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: demoState === 'scanning'
                                    ? '4px solid var(--color-warning)'
                                    : demoState === 'recognized' || demoState === 'logged'
                                        ? '4px solid var(--color-primary)'
                                        : '4px solid var(--color-border)',
                                transition: 'all 0.3s ease'
                            }}>
                                <User size={48} style={{
                                    color: demoState === 'recognized' || demoState === 'logged'
                                        ? 'var(--color-primary)'
                                        : 'var(--color-text-dim)'
                                }} />
                            </div>

                            {/* Scanning Animation */}
                            {demoState === 'scanning' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <div style={{
                                        width: '160px',
                                        height: '160px',
                                        border: '2px solid var(--color-warning)',
                                        borderRadius: '50%',
                                        animation: 'pulse 1s infinite'
                                    }} />
                                </motion.div>
                            )}

                            {/* Recognition Result */}
                            {(demoState === 'recognized' || demoState === 'logged') && currentEmployee && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '1rem',
                                        left: '1rem',
                                        right: '1rem',
                                        background: 'rgba(0, 255, 136, 0.1)',
                                        border: '1px solid var(--color-primary)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}
                                >
                                    <CheckCircle size={24} style={{ color: 'var(--color-primary)' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                            {currentEmployee.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            {currentEmployee.id} • {currentEmployee.department}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Status Message */}
                            <div style={{
                                position: 'absolute',
                                top: '1rem',
                                left: '1rem',
                                padding: '0.5rem 1rem',
                                background: demoState === 'scanning'
                                    ? 'rgba(255, 170, 0, 0.2)'
                                    : demoState === 'logged'
                                        ? 'rgba(0, 255, 136, 0.2)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontFamily: 'var(--font-mono)'
                            }}>
                                {demoState === 'idle' && 'AWAITING FACE...'}
                                {demoState === 'scanning' && 'SCANNING...'}
                                {demoState === 'recognized' && 'MATCH FOUND'}
                                {demoState === 'logged' && 'CHECK-IN LOGGED ✓'}
                            </div>
                        </div>

                        <div style={{
                            padding: '1rem',
                            display: 'flex',
                            gap: '0.5rem'
                        }}>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={runDemo}
                                disabled={isPlaying}
                            >
                                <Play size={18} />
                                Run Demo
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={resetDemo}
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Live Logs */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="card" style={{ height: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <Clock size={20} style={{ color: 'var(--color-primary)' }} />
                            <h3 style={{ fontWeight: 700 }}>Today's Activity</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {todayLogs.map((log, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem',
                                        background: 'var(--color-bg)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: log.type === 'Check-in'
                                            ? 'rgba(0, 255, 136, 0.2)'
                                            : 'rgba(255, 0, 102, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {log.type === 'Check-in'
                                            ? <CheckCircle size={16} style={{ color: 'var(--color-primary)' }} />
                                            : <Clock size={16} style={{ color: 'var(--color-accent)' }} />
                                        }
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                            {log.location}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontFamily: 'var(--font-mono)',
                                            color: log.type === 'Check-in' ? 'var(--color-primary)' : 'var(--color-accent)'
                                        }}>
                                            {log.time}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                            {log.type}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Sample Timesheet */}
            <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                        <h3 style={{ fontWeight: 700 }}>Auto-Generated Timesheet Preview</h3>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--color-text-dim)', fontWeight: 600 }}>Employee</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--color-text-dim)', fontWeight: 600 }}>Department</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-dim)', fontWeight: 600 }}>Check-in</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-dim)', fontWeight: 600 }}>Check-out</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-dim)', fontWeight: 600 }}>Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sampleEmployees.map((emp) => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ fontWeight: 600 }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{emp.id}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--color-text-dim)' }}>{emp.department}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{emp.checkIn}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{emp.checkOut}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>8.75</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.section>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
            `}</style>
        </motion.div>
    );
}

export default AttendancePage;
