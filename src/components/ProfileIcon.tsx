// src/components/ProfileIcon.tsx
// Main profile trigger with responsive behavior

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import ProfilePage from './ProfilePage';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus: string;
  profilePicture?: string;
}

const ProfileIcon = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch minimal user data for avatar display
  const fetchUserForAvatar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }
      
      const data = await response.json();
      setUser(data.data); // Backend returns data.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
      console.error('Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data on mount
  useEffect(() => {
    fetchUserForAvatar();
  }, []);

  const handleProfileClick = () => {
    if (isMobile) {
      setIsMobileProfileOpen(true);
    }
    // For desktop, the dropdown is handled by ProfileDropdown component
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
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
  if (error || !user) {
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
            <AvatarImage src={user.profilePicture} alt={user.fullName} />
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
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
  return <ProfileDropdown />;
};

export default ProfileIcon;
