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
import { User, Settings, LogOut, Loader2 } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/integrations/userProfileApi";
import AccountSettings from "./AccountSettings";
import EditProfileModal from "./EditProfileModal";
import { handleImageError, constructImageUrl, getCacheBustingTimestamp } from "@/utils/imageUtils";

const UserProfileDropdown = () => {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  
  const {
    profile,
    isLoading,
    error,
    isSaving,
    updateProfile,
    clearError,
  } = useUserProfile();
  
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleSaveProfile = async (data: { fullName?: string; profilePicture?: string }) => {
    await updateProfile(data);
    setShowEditProfile(false);
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
              <AvatarImage 
                src={profile.profilePicture ? constructImageUrl(profile.profilePicture, getCacheBustingTimestamp()) : ''} 
                alt={profile.fullName}
                onError={(e) => handleImageError(e, profile.fullName)}
              />
              <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="end" forceMount>
          {/* Profile Header */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={profile.profilePicture ? constructImageUrl(profile.profilePicture, getCacheBustingTimestamp()) : ''} 
                  alt={profile.fullName}
                  onError={(e) => handleImageError(e, profile.fullName)}
                />
                <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="font-medium">{profile.fullName}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            
            {/* Status and Role */}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={profile.accountStatus === "active" ? "default" : "secondary"}>
                {profile.accountStatus}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">
                {profile.role}
              </span>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Menu Items */}
          <div className="p-2">
            <DropdownMenuItem
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setShowAccountSettings(true)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onSave={handleSaveProfile}
        isSaving={isSaving}
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
    </>
  );
};

export default UserProfileDropdown;
