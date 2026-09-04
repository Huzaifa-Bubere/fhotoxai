/**
 * Sample data for Photo Clustering system
 * This will be replaced with actual API calls in production
 */

// Sample attendee data with a profile photo
export const attendeeData = {
  name: "John Smith",
  profilePhoto: "https://picsum.photos/seed/attendee1/300/300",
  events: [
    { 
      id: "event_1", 
      name: "Corporate Conference 2026", 
      date: "2026-01-15", 
      location: "San Francisco Convention Center",
      matchedPhotos: 32,
      totalPhotos: 243
    }
  ]
};

// Sample folder data structure
export const sampleFoldersInitial = [
  {
    id: 'event_1',
    name: 'Corporate Conference 2026',
    date: '2026-01-15',
    totalPhotos: 243,
    subfolders: [
      { id: 'event_1_keynote', name: 'Keynote Sessions', photoCount: 86 },
      { id: 'event_1_networking', name: 'Networking Event', photoCount: 65 },
      { id: 'event_1_awards', name: 'Awards Ceremony', photoCount: 92 },
    ]
  },
  {
    id: 'event_2',
    name: 'Product Launch Event',
    date: '2026-02-22',
    totalPhotos: 187,
    subfolders: [
      { id: 'event_2_demo', name: 'Product Demonstrations', photoCount: 73 },
      { id: 'event_2_press', name: 'Press Conference', photoCount: 42 },
      { id: 'event_2_afterparty', name: 'After Party', photoCount: 72 },
    ]
  }
];

// Sample active trainings data
export const sampleActiveTrainings = [
  {
    id: 'training_1',
    eventName: 'Corporate Conference 2026',
    status: 'in_progress',
    progress: 65,
    startedAt: '2026-01-28T10:30:00',
    photosProcessed: 157,
    totalPhotos: 243,
    facesDetected: 543
  },
  {
    id: 'training_2',
    eventName: 'Product Launch Event',
    status: 'queued',
    progress: 0,
    startedAt: null,
    photosProcessed: 0,
    totalPhotos: 187,
    facesDetected: 0
  }
];

// Sample photo data with placeholder images
export const samplePhotosInitial = {
  'event_1': [
    { id: 'photo_1_1', url: 'https://picsum.photos/seed/event1_1/800/600', title: 'Opening Keynote', tags: ['keynote', 'speaker'] },
    { id: 'photo_1_2', url: 'https://picsum.photos/seed/event1_2/800/600', title: 'Panel Discussion', tags: ['panel', 'discussion'] },
    { id: 'photo_1_3', url: 'https://picsum.photos/seed/event1_3/800/600', title: 'Networking Session', tags: ['networking', 'attendees'] },
    { id: 'photo_1_4', url: 'https://picsum.photos/seed/event1_4/800/600', title: 'Closing Remarks', tags: ['closing', 'speaker'] }
  ],
  'event_2': [
    { id: 'photo_2_1', url: 'https://picsum.photos/seed/event2_1/800/600', title: 'Product Reveal', tags: ['product', 'launch'] },
    { id: 'photo_2_2', url: 'https://picsum.photos/seed/event2_2/800/600', title: 'Demo Session', tags: ['demo', 'product'] },
    { id: 'photo_2_3', url: 'https://picsum.photos/seed/event2_3/800/600', title: 'Press Interview', tags: ['press', 'media'] }
  ],
  'user_photos': [
    { id: 'photo_user_1', url: 'https://picsum.photos/seed/user1/800/600', title: 'At Registration', tags: ['attendee', 'registration'] },
    { id: 'photo_user_2', url: 'https://picsum.photos/seed/user2/800/600', title: 'During Keynote', tags: ['attendee', 'keynote'] },
    { id: 'photo_user_3', url: 'https://picsum.photos/seed/user3/800/600', title: 'Networking Event', tags: ['attendee', 'networking'] },
    { id: 'photo_user_4', url: 'https://picsum.photos/seed/user4/800/600', title: 'Product Demo', tags: ['attendee', 'demo'] }
  ]
};

// Initial training metrics
export const initialTrainingMetrics = {
  totalPhotos: 243,
  totalFaces: 862,
  uniqueIdentities: 78,
  completionStatus: '0%',
  lastTrainingTimestamp: null
};
