import React, { useRef, useState } from 'react';
import { Upload, FileImage, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear, disabled }) => {
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    if (!selectedFile && !disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  if (selectedFile) {
    return (
      <div className="relative w-full p-6 glass-card-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <FileImage className="w-8 h-8 farmer-icon" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{selectedFile.name}</p>
            <p className="text-xs text-earth-muted">{(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
        <button
          onClick={onClear}
          disabled={disabled}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-earth-muted hover:text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        upload-dropzone w-full p-10 cursor-pointer transition-all duration-200
        flex flex-col items-center justify-center space-y-4
        ${isDragging ? 'active scale-[1.01]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleInputChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
      <div className="p-4 bg-white/5 rounded-full border border-white/5">
        <Upload className={`w-8 h-8 ${isDragging ? 'farmer-icon' : 'text-earth-muted'}`} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-white">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-earth-muted mt-1">
          Supported formats: PNG, JPG, JPEG, WEBP
        </p>
      </div>
    </div>
  );
};
