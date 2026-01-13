// src/components/UserProfileDropdown.tsx
// Desktop profile dropdown component

import React, { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Settings, Key, LogOut, Camera, Save, X, Shield, Bell } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/integrations/userProfileApi";
import AccountSettings from "./AccountSettings";

const UserProfileDropdown = () => {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  
  const {
    profile,
    isLoading,
    error,
    isEditing,
    isSaving,
    isUploading,
    startEditing,
    cancelEditing,
    saveChanges,
    uploadPicture,
    clearError,
  } = useUserProfile();
  
  // Local state for temp profile data
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({});
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset temp profile when editing starts
  useEffect(() => {
    if (isEditing && profile) {
      setTempProfile({
        fullName: profile.fullName,
        profilePicture: profile.profilePicture,
      });
    } else if (!isEditing) {
      setTempProfile({});
    }
  }, [isEditing, profile]);

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
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("user");
      navigate("/login");
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

  const handleSaveChanges = async () => {
    if (!profile) return;
    
    const changes: { fullName?: string; profilePicture?: string } = {};
    
    if (tempProfile.fullName !== undefined && tempProfile.fullName !== profile.fullName) {
      changes.fullName = tempProfile.fullName;
    }
    
    if (tempProfile.profilePicture !== undefined && tempProfile.profilePicture !== profile.profilePicture) {
      changes.profilePicture = tempProfile.profilePicture;
    }
    
    if (Object.keys(changes).length > 0) {
      await saveChanges();
    } else {
      // No changes to save
      cancelEditing();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Button variant="ghost" size="icon" onClick={clearError}>
        <User className="h-4 w-4" />
      </Button>
    );
  }

  if (!profile) {
    return (
      <Button variant="ghost" size="icon">
        <User className="h-4 w-4" />
      </Button>
    );
  }

  const currentName = isEditing ? tempProfile.fullName || profile.fullName : profile.fullName;
  const currentPicture = isEditing ? tempProfile.profilePicture || profile.profilePicture : profile.profilePicture;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-8 w-8 rounded-full p-0"
            aria-label="User profile menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentPicture} alt={currentName} />
              <AvatarFallback>{getInitials(currentName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="end" forceMount>
          {/* Profile Header */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentPicture} alt={currentName} />
                  <AvatarFallback>{getInitials(currentName)}</AvatarFallback>
                </Avatar>
                
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Upload profile picture"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={tempProfile.fullName || ""}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Full name"
                      className="text-sm"
                      aria-label="Full name"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium">{currentName}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status and Role */}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={profile?.accountStatus === "active" ? "default" : "secondary"}>
                {profile?.accountStatus}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">
                {profile?.role}
              </span>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Menu Items */}
          <div className="p-2">
            {!isEditing && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => setShowAccountSettings(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/change-password" className="flex items-center gap-2 cursor-pointer">
                    <Key className="h-4 w-4" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={startEditing}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
              </>
            )}
            
            {isEditing && (
              <>
                <DropdownMenuItem
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={cancelEditing}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Profile picture upload"
          />
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAccountSettings(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <AccountSettings onClose={() => setShowAccountSettings(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfileDropdown;
