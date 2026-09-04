// ========================================
// DESIGN TOKENS
// ========================================
export const TOKENS = {
    colors: {
        black: '#050505',
        dark: '#0a0a0a',
        surface: '#111111',
        surfaceElevated: '#1a1a1a',
        gold: '#e8d5b5',
        goldMuted: '#c4b09a',
        champagne: '#9a8a78',
        bronze: '#7a6a58',
        sepia: '#5a4a38',
        umber: '#3a3028',
        shadow: '#1a1510',
    },
    gradients: {
        dark: 'linear-gradient(145deg, #050505 0%, #0d0a08 50%, #050505 100%)',
        gold: 'linear-gradient(135deg, #e8d5b5 0%, #c4b09a 100%)',
        glow: 'radial-gradient(ellipse at center, rgba(232, 213, 181, 0.06) 0%, transparent 70%)',
        shimmer: 'linear-gradient(90deg, transparent, rgba(232, 213, 181, 0.08), transparent)',
    },
    fonts: {
        display: "'Cinzel', 'Playfair Display', Georgia, serif",
        body: "'Inter', -apple-system, system-ui, sans-serif",
    },
    transitions: {
        cinematic: [0.25, 0.1, 0.25, 1.0],
    }
};

// ========================================
// MOOD PRESETS
// ========================================
export const MOOD_PRESETS = {
    cinematic: {
        name: 'Cinematic',
        icon: '🎬',
        description: 'Teal & orange film look',
        filmGrain: 0.06,
        vignette: 0.55,
        letterbox: 56,
        contrast: 1.1,
        saturation: 1.15,
        accentColor: '#f5a44c',
        lightLeak: false,
        softGlow: false
    },
    dreamy: {
        name: 'Dreamy',
        icon: '✨',
        description: 'Soft ethereal glow',
        filmGrain: 0.02,
        vignette: 0.25,
        letterbox: 0,
        contrast: 0.95,
        saturation: 1.05,
        blur: 0.3,
        accentColor: '#c4a0e8',
        lightLeak: true,
        softGlow: true
    },
    nostalgic: {
        name: 'Nostalgic',
        icon: '📷',
        description: 'Vintage memory feel',
        filmGrain: 0.12,
        vignette: 0.65,
        letterbox: 44,
        contrast: 1.05,
        saturation: 0.75,
        accentColor: '#d4a574',
        lightLeak: true,
        softGlow: false
    },
    vibrant: {
        name: 'Vibrant',
        icon: '🌈',
        description: 'Rich saturated colors',
        filmGrain: 0.01,
        vignette: 0.18,
        letterbox: 0,
        contrast: 1.2,
        saturation: 1.4,
        accentColor: '#ff6b6b',
        lightLeak: false,
        softGlow: false
    },
    minimal: {
        name: 'Minimal',
        icon: '◻️',
        description: 'Clean modern aesthetic',
        filmGrain: 0,
        vignette: 0.12,
        letterbox: 72,
        contrast: 1.12,
        saturation: 0.85,
        accentColor: '#ffffff',
        lightLeak: false,
        softGlow: false
    },
    dramatic: {
        name: 'Dramatic',
        icon: '🌙',
        description: 'High contrast shadows',
        filmGrain: 0.08,
        vignette: 0.75,
        letterbox: 48,
        contrast: 1.35,
        saturation: 1.08,
        accentColor: '#5a9fd4',
        lightLeak: false,
        softGlow: false
    }
};

export const DEFAULT_MUSIC_TRACKS = [
    { name: 'Emotional Piano', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
    { name: 'Cinematic Strings', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4db9e0bb94.mp3' },
    { name: 'Nostalgic Memories', url: 'https://cdn.pixabay.com/audio/2023/02/28/audio_550d815fa5.mp3' }
];
