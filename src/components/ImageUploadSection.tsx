// src/components/ImageUploadSection.tsx
// Enhanced image upload component for daily reports with Supabase integration

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { useDailyReportImages } from '@/hooks/useDailyReportImages';
import { cn } from '@/lib/utils';

interface ImageUploadSectionProps {
  sectionName: string;
  title: string;
  maxFiles?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

interface UploadedImage {
  id: string;
  url: string;
  caption: string;
  isUploading?: boolean;
  error?: string;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  sectionName,
  title,
  maxFiles = 10,
  accept = 'image/*',
  className,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const {
    addFilesToSection,
    removeImageFromSection,
    updateImageCaption,
    getSection,
    getUploadProgress,
    setError
  } = useDailyReportImages();

  const section = getSection(sectionName);
  const isUploading = getUploadProgress(sectionName);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || disabled) return;

    const fileArray = Array.from(files);
    
    // Filter for image files
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please select image files only');
      return;
    }

    // Check max files limit
    const currentCount = section.images.length;
    if (currentCount + imageFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Upload files
    addFilesToSection(sectionName, imageFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleRemoveImage = (index: number) => {
    removeImageFromSection(sectionName, index);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    updateImageCaption(sectionName, index, caption);
  };

  const getImageUrl = (image: any): string => {
    if (image.supabaseUrl) return image.supabaseUrl;
    if (image.legacyBase64) return image.legacyBase64;
    if (image.file && image.file instanceof File) {
      return URL.createObjectURL(image.file);
    }
    return '';
  };

  const renderUploadArea = () => (
    <Card className={cn(
      'border-2 border-dashed transition-colors',
      dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <CardContent className="p-6">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              {title}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max {maxFiles} images • PNG, JPG, GIF up to 10MB
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Select Images
              </>
            )}
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
      </CardContent>
    </Card>
  );

  const renderImageCard = (image: any, index: number) => (
    <Card key={index} className="relative overflow-hidden">
      <div className="aspect-square relative bg-gray-100">
        {image.isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : image.error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        ) : (
          <img
            src={getImageUrl(image)}
            alt={image.caption || `Image ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-image.png';
            }}
          />
        )}
        
        {!disabled && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={() => handleRemoveImage(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <CardContent className="p-3">
        <input
          type="text"
          placeholder="Add caption..."
          value={image.caption || ''}
          onChange={(e) => handleCaptionChange(index, e.target.value)}
          disabled={disabled}
          className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        
        {image.error && (
          <p className="text-xs text-red-500 mt-1">{image.error}</p>
        )}
        
        {image.fileName && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {image.fileName}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {renderUploadArea()}
      
      {section.images.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <ImageIcon className="mr-2 h-5 w-5" />
            Uploaded Images ({section.images.length}/{maxFiles})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.images.map((image, index) => renderImageCard(image, index))}
          </div>
        </div>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Uploading images...</p>
          <Progress value={undefined} className="w-full" />
        </div>
      )}
    </div>
  );
};
