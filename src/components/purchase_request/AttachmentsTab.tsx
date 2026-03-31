import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, FileImage, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Attachment {
  id: string;
  filename: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  status: 'uploading' | 'completed' | 'error';
  imageData?: string; // Base64 data for image thumbnails
}

interface AttachmentsTabProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  mode: string;
  isSubmitting: boolean;
  formData: any;
  handleSubmit: (action: string) => void;
  setActiveTab?: (tab: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
}

const AttachmentsTab: React.FC<AttachmentsTabProps> = ({
  attachments,
  onAttachmentsChange,
  mode,
  isSubmitting,
  formData,
  handleSubmit,
  setActiveTab,
  maxFiles = 10,
  maxFileSize = 10,
  allowedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="text-red-500" size={20} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileImage className="text-blue-500" size={20} />;
      case 'doc':
      case 'docx':
        return <FileText className="text-blue-600" size={20} />;
      default:
        return <FileText className="text-gray-500" size={20} />;
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExt)) {
      return `File type ${fileExt} is not allowed`;
    }

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    return null;
  };

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const filesArray = Array.from(files);
    const newAttachments: Attachment[] = [];
    const errors: string[] = [];

    console.log(`Starting upload of ${filesArray.length} files`);

    // Process files sequentially to avoid race conditions
    const processFile = async (file: File, fileIndex: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if we've reached max files
        if (attachments.length + newAttachments.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          resolve();
          return;
        }

        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          resolve();
          return;
        }

        const attachment: Attachment = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          filename: file.name,
          fileSize: formatFileSize(file.size),
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          status: 'uploading'
        };

        console.log(`Processing file ${fileIndex + 1}/${filesArray.length}: ${file.name}, ID: ${attachment.id}`);
        newAttachments.push(attachment);

        // If it's an image, read the file data for thumbnail
        if (isImageFile(file.name)) {
          console.log(`Reading image data for ${file.name}, ID: ${attachment.id}`);
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const imageData = e.target?.result as string;
            console.log(`Image data loaded for ${file.name}, ID: ${attachment.id}, Data length: ${imageData?.length || 0}`);
            console.log(`Base64 preview for ${file.name}:`, imageData?.substring(0, 100) + '...');
            
            // Log to network tab by creating a custom event
            if (typeof window !== 'undefined') {
              console.log(`NETWORK_DATA_${attachment.id}:`, imageData);
              // Also store in window for network inspection
              (window as any)[`attachment_${attachment.id}`] = imageData;
            }
            
            // Update the attachment in newAttachments array instead of currentAttachments
            const attachmentIndex = newAttachments.findIndex(a => a.id === attachment.id);
            if (attachmentIndex !== -1) {
              newAttachments[attachmentIndex] = { ...newAttachments[attachmentIndex], imageData };
              console.log(`Updated attachment ${attachment.id} in newAttachments array:`, newAttachments[attachmentIndex]);
            }
            resolve();
          };
          
          reader.onerror = (error) => {
            console.error(`Error reading file ${file.name}:`, error);
            reject(error);
          };
          
          reader.readAsDataURL(file);
        } else {
          // For non-image files, resolve immediately
          resolve();
        }
      });
    };

    // Process all files sequentially
    const processAllFiles = async () => {
      try {
        for (let i = 0; i < filesArray.length; i++) {
          await processFile(filesArray[i], i);
        }
        
        console.log('All files processed successfully');
        
        if (errors.length > 0) {
          console.error('Upload errors:', errors);
        }

        if (newAttachments.length > 0) {
          const updatedAttachments = [...attachments, ...newAttachments];
          console.log(`Adding ${newAttachments.length} new attachments to list`);
          console.log('Final attachments list:', updatedAttachments);
          
          // Store all attachments globally for network inspection
          if (typeof window !== 'undefined') {
            (window as any).allAttachments = updatedAttachments;
            console.log('All attachments stored in window.allAttachments for inspection');
            
            // Log each attachment's image data to network tab
            updatedAttachments.forEach((att, index) => {
              if (att.imageData) {
                console.log(`ATTACHMENT_${index + 1}_${att.filename}:`, {
                  id: att.id,
                  filename: att.filename,
                  hasImageData: !!att.imageData,
                  imageDataLength: att.imageData.length,
                  imageDataPreview: att.imageData.substring(0, 100) + '...',
                  fullImageData: att.imageData
                });
              }
            });
          }
          
          onAttachmentsChange(updatedAttachments);

          // Simulate upload completion - fix the logic to handle multiple files correctly
          newAttachments.forEach((attachment, index) => {
            setTimeout(() => {
              const currentAttachments = attachmentsRef.current;
              const updatedAttachments = currentAttachments.map(a => 
                a.id === attachment.id 
                  ? { ...a, status: 'completed' as const }
                  : a
              );
              onAttachmentsChange(updatedAttachments);
            }, 1000 + index * 500); // Stagger completion times
          });
        }
      } catch (error) {
        console.error('Error processing files:', error);
      }
    };

    processAllFiles();
  }, [attachments, maxFiles, maxFileSize, allowedFileTypes, onAttachmentsChange]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i <items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        console.log('Pasted files detected:', files.map(f => f.name));
        handleFileUpload(files as unknown as FileList);
      }
    };

    // Add paste listener to the document and also make the drop zone focusable
    document.addEventListener('paste', handlePaste);
    
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileUpload]);

  const handleDoubleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Add click handler to ensure the drop zone can receive focus
  const handleDropZoneClick = useCallback(() => {
    // Make the drop zone focusable so it can receive paste events
    const dropZone = document.querySelector('[data-drop-zone]') as HTMLElement;
    if (dropZone) {
      dropZone.focus();
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+V or Cmd+V to trigger paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      // Create a paste event manually
      const pasteEvent = new Event('paste', { bubbles: true });
      e.currentTarget.dispatchEvent(pasteEvent);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleDeleteAttachment = useCallback((id: string) => {
    const updatedAttachments = attachments.filter(a => a.id !== id);
    onAttachmentsChange(updatedAttachments);
  }, [attachments, onAttachmentsChange]);

  const getStatusIcon = (status: Attachment['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="text-blue-500 animate-spin" size={16} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
    }
  };

  // Helper functions for the new grid layout
  const isImageFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
  };

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const formatUploadTime = (uploadedAt: string): string => {
    const date = new Date(uploadedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getFilePreview = (attachment: Attachment): string => {
    // Return the actual image data if available
    if (isImageFile(attachment.filename) && attachment.imageData) {
      return attachment.imageData;
    }
    return '';
  };

  const handleDownloadFile = (attachment: Attachment) => {
    // In a real app, this would trigger a download
    console.log('Downloading file:', attachment.filename);
    // window.open('/api/attachment/download/' + attachment.id, '_blank');
  };

  const handlePreviewImage = (attachment: Attachment) => {
    // In a real app, this would open an image preview modal
    console.log('Previewing image:', attachment.filename);
  };

  return (
    <div 
      className="p-6 bg-white dark:bg-gray-900 min-h-[calc(95vh-200px)] transition-colors duration-200 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Drop Zone */}
      <div
        data-drop-zone="true"
        className={`
          border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <Upload className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Drag and drop files here
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Double-click to select files
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Press Ctrl+V (Cmd+V on Mac) to paste files
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Max {maxFiles} files • Max {maxFileSize}MB each • {allowedFileTypes.join(', ')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Empty State - More Prominent */}
      {attachments.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <FileText className="mx-auto text-gray-300 dark:text-gray-600 mb-6" size={80} />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
              No files uploaded yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Upload supporting documents to complete your purchase request
            </p>
          </div>
        </div>
      )}

      {/* File Grid */}
      {attachments.length > 0 && (
        <div className="flex-1 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Uploaded Files ({attachments.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* File Preview/Thumbnail */}
                <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative">
                  {isImageFile(attachment.filename) ? (
                    <img
                      src={getFilePreview(attachment)}
                      alt={attachment.filename}
                      className="w-full h-full object-contain rounded"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${isImageFile(attachment.filename) ? 'hidden' : ''} flex flex-col items-center justify-center`}>
                    {getFileIcon(attachment.filename)}
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      {getFileExtension(attachment.filename)}
                    </span>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(attachment.status)}
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="transform scale-90 group-hover:scale-100 transition-transform"
                    >
                      View
                    </Button>
                  </div>
                </div>
                
                {/* File Info */}
                <div className="p-3">
                  <div className="min-h-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1" title={attachment.filename}>
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {attachment.fileSize}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatUploadTime(attachment.uploadedAt)}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleDownloadFile(attachment)}
                      >
                        Download
                      </Button>
                      {isImageFile(attachment.filename) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => handlePreviewImage(attachment)}
                        >
                          Preview
                        </Button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors duration-150"
                      title="Delete file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons - Fixed at Bottom */}
      <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          {/* Left side - Previous button */}
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // Navigate back to Material Actual Cost tab
                if (setActiveTab) {
                  setActiveTab('placeholder1');
                }
              }}
            >
              ← Previous
            </Button>
          </div>
          
          {/* Right side - Export, Preview and Cancel */}
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // Export logic here
                console.log("This is final formData: ", formData);
              }}
            >
              Export
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // Preview logic here
                console.log("Preview clicked");
              }}
            >
              Preview
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // This would need to be passed as a prop or handled differently
                console.log("Cancel clicked");
              }}
            >
              Cancel
            </Button>

            {mode === 'create' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    type="button" 
                    disabled={isSubmitting || !formData.projectName || formData.items.length === 0}
                  >
                    {isSubmitting ? "Processing..." : "Options ▼"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleSubmit('post')}>
                    {isSubmitting ? "Posting..." : "Post"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSubmit('draft')}>
                    {isSubmitting ? "Saving..." : "Save as Draft"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : mode === 'edit' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    type="button" 
                    disabled={isSubmitting || !formData.projectName || formData.items.length === 0}
                  >
                    {isSubmitting ? "Processing..." : "Options ▼"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => handleSubmit('post')}
                    disabled={formData?.status !== 'draft'}
                    className={formData?.status !== 'draft' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                    {formData?.status !== 'draft' && (
                      <span className="ml-2 text-xs text-gray-500">(Only for drafts)</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSubmit('update')}>
                    {isSubmitting ? "Updating..." : "Update"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                type="button" 
                disabled={isSubmitting || !formData.projectName || formData.items.length === 0}
                onClick={() => handleSubmit('revise')}
              >
                {isSubmitting ? "Revising..." : "Revise"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachmentsTab;