// src/components/ProfileDropdown.tsx
// Desktop profile dropdown with inline editing

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  User,
  Settings,
  Key,
  LogOut,
  Camera,
  Save,
  X,
  Mail,
  Calendar,
  Shield,
} from 'lucide-react';
import useProfile from '@/hooks/useProfile';

const ProfileDropdown = () => {
  const {
    user,
    accountSettings,
    loading,
    error,
    editing,
    uploading,
    saving,
    fetchProfile,
    updateProfile,
    uploadProfilePicture,
    updateAccountSettings,
    logout,
    setEditing,
    clearError,
  } = useProfile();

  const [tempUser, setTempUser] = useState<Partial<any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset temp user when editing starts
  useEffect(() => {
    if (editing && user) {
      setTempUser({
        fullName: user.fullName,
        profilePicture: user.profilePicture,
      });
    } else if (!editing) {
      setTempUser({});
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [editing, user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        console.error('File too large');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    
    const updates: any = {};
    
    if (tempUser.fullName !== user.fullName) {
      updates.fullName = tempUser.fullName;
    }
    
    if (selectedFile) {
      await uploadProfilePicture(selectedFile);
      return;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    } else {
      setEditing(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      setEditing(false);
    } else {
      setEditing(true);
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
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <Button variant="ghost" size="icon" onClick={clearError}>
        <User className="h-4 w-4" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon">
        <User className="h-4 w-4" />
      </Button>
    );
  }

  const currentName = editing ? tempUser.fullName || user.fullName : user.fullName;
  const currentPicture = previewUrl || tempUser.profilePicture || user.profilePicture;

  return (
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
              
              {editing && (
                <Button
                  size="sm"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Upload profile picture"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                  <Input
                    id="fullName"
                    value={tempUser.fullName || ''}
                    onChange={(e) => setTempUser(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full name"
                    className="text-sm h-8"
                    aria-label="Full name"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-sm">{currentName}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Status and Role */}
          <div className="flex items-center gap-2 mt-3">
            {getStatusBadge(user.accountStatus)}
            <span className="text-xs text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Error Display */}
        {error && (
          <Alert className="mx-4 mb-4" variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Menu Items */}
        <div className="p-2">
          {editing ? (
            <>
              <DropdownMenuItem
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={handleEditToggle}
                disabled={saving}
                className="flex items-center gap-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancel
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={handleEditToggle}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Camera className="h-4 w-4" />
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
            </>
          )}
          
          <DropdownMenuItem
            onClick={logout}
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
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Profile picture upload"
        />
      </DropdownMenuContent>
      
      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAccountSettings(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Account Settings</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAccountSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Notifications */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Notifications</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Notifications</span>
                      <Button
                        variant={accountSettings.emailNotifications ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateAccountSettings({ 
                          emailNotifications: !accountSettings.emailNotifications 
                        })}
                      >
                        {accountSettings.emailNotifications ? 'On' : 'Off'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Push Notifications</span>
                      <Button
                        variant={accountSettings.pushNotifications ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateAccountSettings({ 
                          pushNotifications: !accountSettings.pushNotifications 
                        })}
                      >
                        {accountSettings.pushNotifications ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Privacy */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Privacy</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Profile Visibility</span>
                      <Button
                        variant={accountSettings.profileVisibility ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateAccountSettings({ 
                          profileVisibility: !accountSettings.profileVisibility 
                        })}
                      >
                        {accountSettings.profileVisibility ? 'Public' : 'Private'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Two-Factor Auth</span>
                      <Button
                        variant={accountSettings.twoFactorAuth ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateAccountSettings({ 
                          twoFactorAuth: !accountSettings.twoFactorAuth 
                        })}
                      >
                        {accountSettings.twoFactorAuth ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DropdownMenu>
  );
};

export default ProfileDropdown;
