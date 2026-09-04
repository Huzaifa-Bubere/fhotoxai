-- ============================================================
-- PostgreSQL Schema for Event Photography System
-- Requires: pgvector extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO roles (name, description) VALUES 
    ('admin', 'System Administrator'),
    ('organizer', 'Event Organizer'),
    ('photographer', 'Event Photographer')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date VARCHAR(50),
    location TEXT,
    description TEXT,
    event_time VARCHAR(50),
    photography_service BOOLEAN DEFAULT TRUE,
    data_retention VARCHAR(10) DEFAULT '3',
    event_size VARCHAR(50) DEFAULT '1-300',
    event_uuid VARCHAR(50),
    owner_email VARCHAR(255),
    photographer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    banner_path TEXT,
    qr_code_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_events (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'organizer',
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_photographers (
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    photographer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, photographer_id)
);

-- ============================================================
-- PHOTOS & UPLOADS
-- ============================================================

CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attendee_id INTEGER,
    file_path TEXT NOT NULL,
    original_filename VARCHAR(500),
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    file_size BIGINT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_attendee_id ON photos(attendee_id);

CREATE TABLE IF NOT EXISTS upload_jobs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    photographer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attendee_id INTEGER,
    folder_name VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    total_photos INTEGER DEFAULT 0,
    photos_processed INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    photos_failed INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================================
-- ATTENDEES (with pgvector for face embeddings)
-- ============================================================

CREATE TABLE IF NOT EXISTS attendees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    face_embedding vector(512),
    face_embedding_path TEXT,
    cluster_id INTEGER,
    consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);

-- Add HNSW index for fast embedding similarity search
CREATE INDEX IF NOT EXISTS idx_attendees_embedding ON attendees 
    USING hnsw (face_embedding vector_cosine_ops);

-- Add foreign key for attendee_id in photos
ALTER TABLE photos 
    ADD CONSTRAINT fk_photos_attendee_id 
    FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;

ALTER TABLE upload_jobs 
    ADD CONSTRAINT fk_upload_jobs_attendee_id 
    FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;

-- ============================================================
-- FACE DETECTION & CLUSTERING (with pgvector)
-- ============================================================

CREATE TABLE IF NOT EXISTS people_clusters (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    cluster_name VARCHAR(255),
    thumbnail_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
    centroid vector(512),
    face_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clusters_event_id ON people_clusters(event_id);

-- HNSW index for fast centroid similarity search
CREATE INDEX IF NOT EXISTS idx_clusters_centroid ON people_clusters 
    USING hnsw (centroid vector_cosine_ops);

CREATE TABLE IF NOT EXISTS faces (
    id SERIAL PRIMARY KEY,
    photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
    person_cluster_id INTEGER REFERENCES people_clusters(id) ON DELETE SET NULL,
    embedding vector(512),
    embedding_path TEXT,
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    quality_score REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faces_photo_id ON faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_faces_cluster_id ON faces(person_cluster_id);

-- HNSW index for fast face embedding search
CREATE INDEX IF NOT EXISTS idx_faces_embedding ON faces 
    USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- TRAINING JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS training_jobs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    total_photos INTEGER DEFAULT 0,
    faces_detected INTEGER DEFAULT 0,
    clusters_formed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
