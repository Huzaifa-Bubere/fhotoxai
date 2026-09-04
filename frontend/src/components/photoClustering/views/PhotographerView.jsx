import React from 'react';
import UploadSection from '../ui/UploadSection';
import FolderList from '../ui/FolderList';

/**
 * Photographer View Component
 * Dashboard for photographers to upload and manage photos
 */
const PhotographerView = ({
  isProcessing,
  showSuccess,
  uploadResults,
  fileInputRef,
  folders,
  expandedFolders,
  activeUploads,
  onUpload,
  onToggleFolder,
  onViewPhotos
}) => {
  return (
    <div className="system-content">
      {/* Upload Section */}
      <UploadSection
        isProcessing={isProcessing}
        showSuccess={showSuccess}
        uploadResults={uploadResults}
        fileInputRef={fileInputRef}
        activeUploads={activeUploads}
        onUpload={onUpload}
      />
      
      {/* Folder List Section */}
      <FolderList
        folders={folders}
        expandedFolders={expandedFolders}
        onToggleFolder={onToggleFolder}
        onViewPhotos={onViewPhotos}
      />
    </div>
  );
};

export default PhotographerView;
