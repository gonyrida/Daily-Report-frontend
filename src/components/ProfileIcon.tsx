import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User } from "lucide-react";
import UserProfileDropdown from "./UserProfileDropdown";
import ProfilePage from "./ProfilePage";
import { saveProfileLocally, loadProfileLocally } from "@/lib/storageUtils";
import {
  handleImageError,
  constructAuthenticatedImageUrl,
  getCacheBustingTimestamp,
} from "@/utils/imageUtils";
import { API_BASE_URL } from "@/config/api";
import { API_ENDPOINTS } from "@/config/api";
import { useProfileContext } from "@/contexts/ProfileContext";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus: string;
  profilePicture?: string;
}

const ProfileIcon = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Use global profile context instead of local state
  const { profile, isLoading, error, refreshProfile } = useProfileContext();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-refresh profile when component mounts if needed
  useEffect(() => {
    if (!profile && !isLoading) {
      refreshProfile();
    }
  }, [profile, isLoading, refreshProfile]);

  const handleProfileClick = () => {
    if (isMobile) {
      setIsMobileProfileOpen(true);
    }
    // For desktop, the dropdown is handled by ProfileDropdown component
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Error state - still clickable
  if (error || !profile) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full p-0 hover:bg-muted"
        onClick={handleProfileClick}
        aria-label="Open profile"
        title="Open profile"
      >
        <User className="h-4 w-4" />
      </Button>
    );
  }

  // Normal state - clickable avatar
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-full p-0 hover:bg-muted"
          onClick={handleProfileClick}
          aria-label="Open profile"
          title="Open profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                profile.profilePicture
                  ? constructAuthenticatedImageUrl(
                      profile.profilePicture,
                      getCacheBustingTimestamp()
                    )
                  : ""
              }
              alt={profile.fullName}
              onError={(e) => handleImageError(e, profile.fullName)}
            />
            <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
          </Avatar>
        </Button>

        <ProfilePage
          isOpen={isMobileProfileOpen}
          onClose={() => setIsMobileProfileOpen(false)}
        />
      </>
    );
  }

  // Desktop - use dropdown
  return <UserProfileDropdown />;
};

export default ProfileIcon;
