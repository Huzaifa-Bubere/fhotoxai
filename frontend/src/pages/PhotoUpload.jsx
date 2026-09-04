import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AILoader from '../components/ui/AILoader';

function PhotoUpload() {
    const [eventId, setEventId] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [lastUploadResult, setLastUploadResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const { addToast } = useToast();

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files) => {
        const fileArray = Array.from(files).map(file => ({
            file,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            preview: URL.createObjectURL(file),
            id: Math.random().toString(36).substr(2, 9)
        }));

        setUploadedFiles(prev => [...prev, ...fileArray]);
    };

    const removeFile = (id) => {
        setUploadedFiles(prev => prev.filter(file => file.id !== id));
    };

    const handleUpload = async () => {
        if (!eventId) {
            addToast('Please enter an Event ID to proceed.', 'error');
            return;
        }

        if (uploadedFiles.length === 0) {
            addToast('No photos selected for upload.', 'error');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setError(null);
        // addToast(`Uploading ${uploadedFiles.length} files to Neural Cloud...`, "processing");

        try {
            // Import API service
            const { photoAPI } = await import('../services/api.js');

            // Get actual files from the uploadedFiles array
            const files = uploadedFiles.map(f => f.file);
            const folderName = `upload_${Date.now()}`;

            // Upload with progress tracking
            const result = await photoAPI.uploadFolder(
                files,
                folderName,
                eventId,
                '1', // photographer_id
                (progress) => setUploadProgress(progress)
            );

            console.log('Upload result:', result);
            setLastUploadResult(result);
            setUploadComplete(true);
            if ((result?.failed ?? 0) > 0) {
                addToast(`Uploaded ${result.uploaded} photo(s). ${result.failed} failed.`, "info");
            } else {
                addToast(result.message || "Upload sequence completed successfully.", "success");
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload failed. Please try again.');
            addToast(`Upload failed: ${err.message}`, "error");
        } finally {
            setUploading(false);
        }
    };

    const completedUploadCount = lastUploadResult?.uploaded ?? uploadedFiles.length;
    const failedUploadCount = lastUploadResult?.failed ?? 0;

    if (uploadComplete) {
        return (
            <motion.div
                className="page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <CheckCircle size={64} style={{ color: 'var(--color-primary)', margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                        Photos Uploaded Successfully!
                    </h2>
                    <p style={{ color: 'var(--color-text-dim)', marginBottom: '1.5rem' }}>
                        {completedUploadCount} photo{completedUploadCount !== 1 ? 's' : ''} uploaded to event <strong>{eventId}</strong>
                    </p>
                    {failedUploadCount > 0 && (
                        <p style={{ color: 'var(--color-text-dim)', marginBottom: '1.5rem' }}>
                            {failedUploadCount} photo{failedUploadCount !== 1 ? 's' : ''} could not be uploaded.
                        </p>
                    )}

                    <div style={{
                        background: 'var(--color-bg)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        textAlign: 'left',
                        marginBottom: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                            Processing Timeline:
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <div style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    color: 'var(--color-bg)'
                                }}>1</div>
                                <div>
                                    <strong>Upload Cutoff (1-2 days)</strong>
                                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                        All photographers should upload their photos within this period
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <div style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--color-surface-hover)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700'
                                }}>2</div>
                                <div>
                                    <strong>AI Processing</strong>
                                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                        Facial recognition matches attendees across all photos
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <div style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--color-surface-hover)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700'
                                }}>3</div>
                                <div>
                                    <strong>Automated Distribution</strong>
                                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                        Personalized photo collections sent via email/WhatsApp
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setUploadComplete(false);
                            setUploadedFiles([]);
                            setEventId('');
                            setLastUploadResult(null);
                        }}
                    >
                        Upload More Photos
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AILoader
                active={uploading}
                text={`ENCRYPTING ${Math.round(uploadProgress)}%`}
                subtext="Securing media for cloud ingestion..."
            />

            <div className="page-header">
                <h1 className="page-title">Upload Event Photos</h1>
                <p className="page-description">
                    Upload photos for AI processing and automated distribution to registered attendees
                </p>
            </div>

            <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label">Event ID</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter event ID (e.g., EVT-ABC123)"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                    />
                </div>

                <div
                    className={`upload-zone ${dragActive ? 'drag-over' : ''}`}
                    style={{ padding: '2rem' }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload').click()}
                >
                    <Upload className="upload-icon" />
                    <div className="upload-text">
                        Drag and drop photos here, or click to browse
                    </div>
                    <div className="upload-hint">
                        Supports JPG, PNG, HEIC • Multiple files supported • Max 50MB per file
                    </div>
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                    />
                </div>

                {uploadedFiles.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                            Selected Photos ({uploadedFiles.length})
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '2rem'
                        }}>
                            {uploadedFiles.map(file => (
                                <div
                                    key={file.id}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: 'var(--color-surface)'
                                    }}
                                >
                                    <img
                                        src={file.preview}
                                        alt={file.name}
                                        style={{
                                            width: '100%',
                                            height: '150px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(file.id);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '0.5rem',
                                            right: '0.5rem',
                                            background: 'var(--color-accent)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'white'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                    <div style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                        <div style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {file.name}
                                        </div>
                                        <div style={{ color: 'var(--color-text-dim)' }}>
                                            {file.size}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Upload Deadline:</strong> Please ensure all event photos are uploaded within 1-2 days
                                after the event for timely AI processing and distribution.
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={handleUpload}
                            disabled={uploading || !eventId}
                        >
                            <Upload size={20} />
                            Upload {uploadedFiles.length} Photo{uploadedFiles.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default PhotoUpload;
