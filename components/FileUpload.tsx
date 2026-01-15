import React, { useRef, useState } from 'react';
import { Upload, FileImage, X, Plus } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  selectedFile: File | null;
  selectedFiles?: File[];
  onClear: () => void;
  disabled?: boolean;
  batchMode?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFilesSelect,
  selectedFile,
  selectedFiles = [],
  onClear,
  disabled,
  batchMode = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter((f: File) => f.type.startsWith('image/'));

    if (batchMode && onFilesSelect && imageFiles.length > 0) {
      onFilesSelect(imageFiles);
    } else if (imageFiles.length > 0) {
      onFileSelect(imageFiles[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (batchMode && onFilesSelect && files.length > 0) {
      onFilesSelect(files);
    } else if (files.length > 0) {
      onFileSelect(files[0]);
    }

    // Reset input for re-selection
    e.target.value = '';
  };

  // Show selected files list in batch mode
  if (batchMode && selectedFiles.length > 0) {
    return (
      <div className="space-y-2">
        {selectedFiles.map((file, index) => (
          <div key={index} className="relative w-full p-4 glass-card-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 glass-card-sm">
                <FileImage className="w-6 h-6 farmer-icon" />
              </div>
              <div>
                <p className="text-sm font-medium text-earth truncate max-w-[180px]">{file.name}</p>
                <p className="text-xs text-earth-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={handleClick}
          className="w-full p-3 btn-glass flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add More Images</span>
        </button>
        <input
          type="file"
          ref={inputRef}
          onChange={handleInputChange}
          accept="image/*"
          multiple={batchMode}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }

  // Show single selected file
  if (selectedFile) {
    return (
      <div className="relative w-full p-6 glass-card-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 glass-card-sm">
            <FileImage className="w-8 h-8 farmer-icon" />
          </div>
          <div>
            <p className="text-sm font-medium text-earth">{selectedFile.name}</p>
            <p className="text-xs text-earth-muted">{(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
        <button
          onClick={onClear}
          disabled={disabled}
          className="p-2 btn-glass rounded-full text-earth-muted hover:text-red-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Upload zone
  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        upload-dropzone w-full p-10 transition-all duration-200
        flex flex-col items-center justify-center space-y-4
        ${isDragging ? 'active' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleInputChange}
        accept="image/*"
        multiple={batchMode}
        className="hidden"
        disabled={disabled}
      />
      <div className="p-4 glass-card-sm rounded-full">
        <Upload className={`w-8 h-8 ${isDragging ? 'farmer-icon' : 'text-earth-muted'}`} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-earth">
          {batchMode ? 'Click to upload multiple images' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-sm text-earth-muted mt-1">
          {batchMode ? 'Select multiple files at once' : 'Supported formats: PNG, JPG, JPEG, WEBP'}
        </p>
      </div>
    </div>
  );
};
