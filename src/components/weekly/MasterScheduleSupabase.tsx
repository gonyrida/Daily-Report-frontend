// src/components/weekly/MasterScheduleSupabase.tsx
// Master schedule component with Supabase file upload

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Image, BarChart, X, Download, Trash2 } from 'lucide-react';
import { MasterScheduleEntry } from '@/types/weeklyReport.types';
import { uploadScheduleFileToSupabase, deleteScheduleFileFromSupabase } from '@/utils/weeklyReportSupabase';
import { useToast } from '@/hooks/use-toast';
import { updateMasterSchedule } from '@/services/weeklyReportService';

interface MasterScheduleSupabaseProps {
  entries: MasterScheduleEntry[];
  onChange: (entries: MasterScheduleEntry[]) => void;
  reportId?: string;
  disabled?: boolean;
}

export const MasterScheduleSupabase: React.FC<MasterScheduleSupabaseProps> = ({
  entries,
  onChange,
  reportId,
  disabled = false
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if initial data has loaded

  // Save schedule to database
  const saveScheduleToDatabase = async (updatedEntries: MasterScheduleEntry[]) => {
    if (!reportId) {
      console.log('No reportId provided, skipping database save');
      return;
    }

    setIsSaving(true);
    try {
      
      // Convert entries to backend format (remove file objects if present)
      const entriesForSave = updatedEntries.map(entry => {
        const { file, ...entryWithoutFile } = entry;
        return entryWithoutFile;
      });

      const response = await updateMasterSchedule(reportId, entriesForSave);
      
      if (response.success) {
        console.log('Schedule saved successfully to database');
        toast({
          title: "Schedule Saved",
          description: "Master schedule has been saved to the database",
        });
      } else {
        console.error('Failed to save schedule:', response.error);
        toast({
          title: "Save Failed",
          description: response.error || "Failed to save schedule to database",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Save Error",
        description: "An error occurred while saving the schedule",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Simple debounce function
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Debounced save function to avoid too frequent API calls
  const debouncedSave = useRef(
    debounce((updatedEntries: MasterScheduleEntry[]) => {
      saveScheduleToDatabase(updatedEntries);
    }, 2000) // 2 second delay
  ).current;

  // Enhanced onChange handler that also triggers database save
  const handleChange = (updatedEntries: MasterScheduleEntry[]) => {
    onChange(updatedEntries);
    
    // Only save to database if we've already loaded initial data
    if (reportId && hasLoaded) {
      debouncedSave(updatedEntries);
    }
  };

  // Save schedule when reportId changes from undefined to real ID
  useEffect(() => {
    if (reportId && entries.length > 0 && hasLoaded) {
      console.log('ReportId changed to valid ID, saving schedule to database');
      saveScheduleToDatabase(entries);
    }
  }, [reportId, hasLoaded]);

  const handleFileUpload = async (files: FileList | null, entryType: 'document' | 'image' | 'chart') => {
    if (!files || files.length === 0) return;

    console.log('DEBUG: Starting file upload for', files.length, 'files of type:', entryType);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const newEntries: MasterScheduleEntry[] = [];
      const reportIdToUse = reportId || 'unsaved-report';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 90));

        console.log('DEBUG: Uploading file:', file.name, 'size:', file.size);

        const uploadResult = await uploadScheduleFileToSupabase(file, reportIdToUse, entryType);

        console.log('DEBUG: Upload result for', file.name, ':', uploadResult);

        if (uploadResult.success) {
          const newEntry: MasterScheduleEntry = {
            id: crypto.randomUUID(),
            type: entryType,
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            date: new Date().toISOString().split('T')[0],
            supabaseUrl: uploadResult.supabaseUrl,
            supabasePath: uploadResult.supabasePath
          };

          newEntries.push(newEntry);
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }

      setUploadProgress(100);
      
      handleChange([...entries, ...newEntries]);

      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded to Supabase`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Delete from Supabase if it has a path
    if (entry.supabasePath) {
      try {
        await deleteScheduleFileFromSupabase(entry.supabasePath);
      } catch (error) {
        console.error('Failed to delete from Supabase:', error);
      }
    }

    handleChange(entries.filter(e => e.id !== entryId));

    toast({
      title: "Deleted",
      description: "Entry removed successfully"
    });
  };

  const updateEntry = (id: string, updates: Partial<MasterScheduleEntry>) => {
    const updatedEntries = entries.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    );
    handleChange(updatedEntries);
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'chart': return <BarChart className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Debug: Log current entries state and track initial load
  useEffect(() => {
    // Mark as loaded once we receive entries (initial data load)
    if (entries.length > 0 && !hasLoaded) {
      console.log('Initial entries loaded, count:', entries.length);
      setHasLoaded(true);
    }
    // Also mark as loaded if we have no entries (empty state is also a valid loaded state)
    if (entries.length === 0 && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [entries, hasLoaded]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Master Schedule Files</span>
            <div className="flex items-center gap-2">
              {!reportId && (
                <span className="text-sm text-orange-600">
                  Save report to enable schedule sync
                </span>
              )}
              {isSaving && (
                <span className="text-sm text-blue-600 animate-pulse">
                  Saving to database...
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isUploading && (
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading to Supabase...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Documents
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files, 'image');
                input.click();
              }}
              disabled={disabled || isUploading}
              variant="outline"
            >
              <Image className="w-4 h-4 mr-2" />
              Images
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.xlsx,.xls,.doc,.docx';
                input.multiple = true;
                input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files, 'chart');
                input.click();
              }}
              disabled={disabled || isUploading}
              variant="outline"
            >
              <BarChart className="w-4 h-4 mr-2" />
              Charts
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
            onChange={(e) => handleFileUpload(e.target.files, 'document')}
            className="hidden"
            disabled={disabled || isUploading}
          />

          <div className="space-y-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="w-full">
                  {entry.type === "image" ? (
                    <div className="relative group">
                      <img
                        src={entry.supabaseUrl || URL.createObjectURL(entry.file)}
                        alt={`Schedule image`}
                        className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-900 rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3 rounded-b-lg">
                        <p className="text-sm">{entry.caption || entry.title}</p>
                      </div>
                    </div>
                  ) : entry.fileType === "application/pdf" || entry.fileName?.toLowerCase().endsWith('.pdf') ? (
                    <div className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="w-full" style={{ minHeight: '600px' }}>
                        <iframe
                          src={entry.supabaseUrl || URL.createObjectURL(entry.file)}
                          className="w-full h-full min-h-96 border-0 rounded-lg"
                          title={`PDF: ${entry.fileName}`}
                          onLoad={(e) => {
                            const iframe = e.target as HTMLIFrameElement;
                            try {
                              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                              if (iframeDoc) {
                                const height = iframeDoc.body.scrollHeight;
                                iframe.style.height = `${Math.max(height, 600)}px`;
                              }
                            } catch (error) {
                              iframe.style.height = '800px';
                            }
                          }}
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs">
                          PDF • {entry.fileName}
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-red-500/25"
                          title="Delete PDF"
                          aria-label="Delete PDF"
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center justify-center">
                        {getEntryIcon(entry.type)}
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{entry.fileName}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-red-500/25"
                          title="Delete File"
                          aria-label="Delete File"
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File metadata section */}
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={entry.title}
                      onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                      placeholder="Title"
                      disabled={disabled}
                    />
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  
                  <Textarea
                    value={entry.description || ''}
                    onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                    placeholder="Description"
                    rows={2}
                    disabled={disabled}
                  />

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{entry.fileName}</span>
                    <span>{formatFileSize(entry.fileSize)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {entries.length === 0 && !isUploading && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No schedule files uploaded yet</p>
              <p className="text-sm">Upload documents, images, or charts to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterScheduleSupabase;
