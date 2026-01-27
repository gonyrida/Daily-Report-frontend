// src/components/EditProfileModal.tsx
// Edit Profile modal with image upload functionality

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Camera, Save, X } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setEmail(profile.email || "");
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
      const emailChanged = email !== profile.email;
      const currentPreviewUrl = profile.profilePicture ? constructImageUrl(profile.profilePicture, getCacheBustingTimestamp()) : "";
      const pictureChanged = previewUrl !== currentPreviewUrl;
      setHasChanges(nameChanged || emailChanged || pictureChanged);
    }
  }, [fullName, email, previewUrl, profile]);

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

  const handleSave = async () => {
    if (!profile) return;
    
    const changes: { fullName?: string; email?: string; profilePicture?: string } = {};
    
    if (fullName !== profile.fullName) {
      changes.fullName = fullName;
    }
    
    if (email !== profile.email) {
      changes.email = email;
    }
    
    // If there's a selected file, upload it first
    if (selectedFile) {
      setIsUploading(true);
      try {
        const { uploadProfilePicture } = await import("@/integrations/userProfileApi");
        const result = await uploadProfilePicture(selectedFile);
        
        if (result.success && result.data) {
          changes.profilePicture = result.data.path; // Store relative path
        } else {
          throw new Error("Failed to upload picture");
        }
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload picture",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }
    // Use the stored relative path for database update
    else if (profilePicture !== profile.profilePicture) {
      changes.profilePicture = profilePicture;
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
      setEmail(profile.email);
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
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
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
            
            <div className="pt-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isSaving || isUploading}
              />
            </div>
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
            {isSaving || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
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
