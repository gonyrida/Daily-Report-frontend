// src/components/UserProfilePage.tsx
// Full-page profile view for mobile

import React, { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  User,
  Settings,
  Key,
  LogOut,
  Camera,
  Save,
  X,
  Loader2,
  Mail,
  Calendar,
  Shield,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/integrations/userProfileApi";
import AccountSettings from "./AccountSettings";

interface UserProfilePageProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ isOpen, onClose }) => {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  
  const {
    profile,
    isLoading,
    error,
    isEditing,
    isSaving,
    isUploading,
    tempProfile, // Use hook's tempProfile instead of local state
    startEditing,
    cancelEditing,
    saveChanges,
    uploadPicture,
    clearError,
    fetchProfile,
    updateTempProfile, // Add the new method
  } = useUserProfile();
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile when page opens
  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Profile picture must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      await uploadPicture(file);
    }
  };

  const handleLogout = async () => {
    try {
      const { logoutUser } = await import("@/integrations/authApi");
      await logoutUser();
      
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("user");
      
      // Clear profile cache on logout
      const { clearProfileCache } = await import("@/lib/storageUtils");
      clearProfileCache();
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      
      navigate("/login");
      onClose();
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("user");
      
      // Clear profile cache even on error
      const { clearProfileCache } = await import("@/lib/storageUtils");
      clearProfileCache();
      
      navigate("/login");
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSaveChanges = async () => {
    console.log('DEBUG: Calling hook saveChanges directly');
    
    // Just call the hook's saveChanges which already has all the logic
    await saveChanges();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Profile</h1>
          </div>
          
          {!isEditing && profile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startEditing}
              disabled={isLoading}
            >
              Edit
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="overflow-y-auto pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error && !profile ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={fetchProfile} className="mt-4 w-full">
              Retry
            </Button>
          </div>
        ) : profile ? (
          <div className="p-4 space-y-6">
            {/* Profile Picture Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage 
                        src={isEditing ? (tempProfile.profilePicture || profile.profilePicture) : profile.profilePicture} 
                        alt={isEditing ? (tempProfile.fullName || profile.fullName) : profile.fullName}
                        onError={(e) => {
                          console.error('Profile image failed to load:', isEditing ? (tempProfile.profilePicture || profile.profilePicture) : profile.profilePicture);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(isEditing ? (tempProfile.fullName || profile.fullName) : profile.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isEditing && (
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        aria-label="Upload profile picture"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="w-full space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        value={tempProfile.fullName || ''}
                        onChange={(e) => {
                          updateTempProfile({ fullName: e.target.value });
                          console.log('Name changed:', e.target.value);
                        }}
                        placeholder="Enter your name"
                        className="text-base"
                        aria-label="Full name"
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <h2 className="text-xl font-semibold">{profile.fullName}</h2>
                      <p className="text-muted-foreground">{profile.email}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(profile.accountStatus)}
                    <span className="text-sm text-muted-foreground">{profile.role}</span>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {isEditing && (
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Account Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(profile.accountStatus)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-0">
                <div className="space-y-1">
                  <Link to="/profile" onClick={onClose}>
                    <Button variant="ghost" className="w-full justify-start h-12 px-4">
                      <User className="mr-3 h-4 w-4" />
                      View Full Profile
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-12 px-4"
                    onClick={() => setShowAccountSettings(true)}
                  >
                    <Shield className="mr-3 h-4 w-4" />
                    Account Settings
                  </Button>
                  
                  <Link to="/change-password" onClick={onClose}>
                    <Button variant="ghost" className="w-full justify-start h-12 px-4">
                      <Key className="mr-3 h-4 w-4" />
                      Change Password
                    </Button>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4 text-red-600 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Profile picture upload"
      />
      
      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAccountSettings(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <AccountSettings onClose={() => setShowAccountSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
