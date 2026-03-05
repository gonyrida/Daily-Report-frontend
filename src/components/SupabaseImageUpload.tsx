// src/components/SupabaseImageUpload.tsx
// Image upload component that stores files in Supabase and metadata in MongoDB

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadImageWithMetadata, ImageMetadata } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';

interface SupabaseImageUploadProps {
  onUploadComplete?: (imageUrl: string, mongoId: string) => void;
  onUploadError?: (error: string) => void;
  reportId?: string;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export const SupabaseImageUpload: React.FC<SupabaseImageUploadProps> = ({
  onUploadComplete,
  onUploadError,
  reportId,
  maxFileSize = 50, // 50MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
  disabled = false
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Get current user ID from localStorage (same as your existing pattern)
  const getCurrentUserId = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || user.userId;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      const error = `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`;
      toast({
        title: "Upload Error",
        description: error,
        variant: "destructive"
      });
      onUploadError?.(error);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      const error = `File too large. Maximum size: ${maxFileSize}MB`;
      toast({
        title: "Upload Error", 
        description: error,
        variant: "destructive"
      });
      onUploadError?.(error);
      return;
    }

    // Start upload
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (Supabase doesn't provide progress callbacks)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const metadata: Partial<ImageMetadata> = {
        uploadedBy: getCurrentUserId() || 'anonymous',
        reportId,
        description: `Uploaded from daily report ${reportId || 'unknown'}`
      };

      const result = await uploadImageWithMetadata(
        file,
        metadata,
        '/api/images' // Your existing API endpoint
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.supabaseUrl && result.mongoId) {
        toast({
          title: "Upload Successful",
          description: `${file.name} uploaded successfully`
        });
        onUploadComplete?.(result.supabaseUrl, result.mongoId);
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive"
      });
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || isUploading) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Clear input to allow selecting same file again
    e.target.value = '';
  };

  return (
    <Card className={`border-2 border-dashed transition-colors ${
      dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'} ${className}`}>
      <CardContent className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="text-center"
        >
          {isUploading ? (
            <div className="space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading...</p>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                {dragActive ? (
                  <Upload className="w-12 h-12 text-primary" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {dragActive ? 'Drop image here' : 'Upload image'}
                </p>
                <p className="text-sm text-gray-500">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  Max size: {maxFileSize}MB • {acceptedTypes.join(', ')}
                </p>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                disabled={disabled}
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseImageUpload;
