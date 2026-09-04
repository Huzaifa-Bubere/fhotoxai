export const EVENT_COVERS = [
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2098&auto=format&fit=crop", // Wedding/Reception
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop", // Conf/Corporate
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop", // Concert/Dark
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop", // Celebration
    "https://images.unsplash.com/photo-1505373877841-8d43a716664d?q=80&w=2069&auto=format&fit=crop", // Tech/Modern
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=2070&auto=format&fit=crop", // Nightlife
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=2070&auto=format&fit=crop", // Party
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop", // Festival
    "https://images.unsplash.com/photo-1475721027187-4024733923f9?q=80&w=2070&auto=format&fit=crop"  // Presentation
];

export const getEventCover = (id) => {
    if (!id) return EVENT_COVERS[0];

    // If it's already a number, just use it
    if (typeof id === 'number') {
        return EVENT_COVERS[id % EVENT_COVERS.length];
    }

    // If it's a string, hash it by summing char codes
    const idStr = id.toString();
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
        hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % EVENT_COVERS.length;
    return EVENT_COVERS[index];
};
