// src/components/EditProfileModal.tsx
// Edit Profile modal with image upload functionality

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Camera, Save, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/integrations/userProfileApi";
import { handleImageError, getFallbackAvatarUrl, constructImageUrl, getCacheBustingTimestamp } from "@/utils/imageUtils";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (data: { fullName?: string; profilePicture?: string }) => Promise<void>;
  isSaving: boolean;
}

const EditProfileModal = ({ 
  isOpen, 
  onClose, 
  profile, 
  onSave, 
  isSaving 
}: EditProfileModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setProfilePicture(profile.profilePicture || "");
      // Construct URL from relative path for preview
      setPreviewUrl(profile.profilePicture ? constructImageUrl(profile.profilePicture, getCacheBustingTimestamp()) : "");
      setSelectedFile(null);
      setHasChanges(false);
    }
  }, [profile]);

  // Check for changes
  useEffect(() => {
    if (profile) {
      const nameChanged = fullName !== profile.fullName;
      const currentPreviewUrl = profile.profilePicture ? constructImageUrl(profile.profilePicture, getCacheBustingTimestamp()) : "";
      const pictureChanged = previewUrl !== currentPreviewUrl;
      setHasChanges(nameChanged || pictureChanged);
    }
  }, [fullName, previewUrl, profile]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (JPG, PNG, JPEG).",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Profile picture must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPicture = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const { uploadProfilePicture } = await import("@/integrations/userProfileApi");
      const result = await uploadProfilePicture(selectedFile);
      
      if (result.success && result.data) {
        // Store relative path and construct URL for preview
        const fullUrl = constructImageUrl(result.data.path, getCacheBustingTimestamp());
        
        setProfilePicture(result.data.path); // Store relative path
        setPreviewUrl(fullUrl); // Show full URL for preview
        setSelectedFile(null);
        
        toast({
          title: "Picture Uploaded",
          description: "Profile picture uploaded successfully.",
        });
      } else {
        throw new Error("Failed to upload picture");
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload picture",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    const changes: { fullName?: string; profilePicture?: string } = {};
    
    if (fullName !== profile.fullName) {
      changes.fullName = fullName;
    }
    
    // Use the stored relative path for database update
    if (profilePicture !== profile.profilePicture) {
      changes.profilePicture = profilePicture; // This is now the relative path
    }
    
    if (Object.keys(changes).length > 0) {
      await onSave(changes);
      onClose();
    } else {
      // No changes to save
      onClose();
    }
  };

  const handleCancel = () => {
    // Reset form
    if (profile) {
      setFullName(profile.fullName);
      setProfilePicture(profile.profilePicture);
      setPreviewUrl(profile.profilePicture);
      setSelectedFile(null);
      setHasChanges(false);
    }
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSaving || isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={previewUrl} 
                  alt={fullName}
                  onError={(e) => handleImageError(e, fullName)}
                />
                <AvatarFallback className="text-lg">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload Button */}
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Click the camera icon to change your photo
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or JPEG. Maximum 5MB.
              </p>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Upload button for selected file */}
            {selectedFile && (
              <div className="w-full space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Selected: {selectedFile.name}
                </p>
                <Button
                  onClick={handleUploadPicture}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Picture
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Name Section */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={isSaving || isUploading}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/50">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving || isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isUploading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
