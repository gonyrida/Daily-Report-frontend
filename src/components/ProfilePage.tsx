// src/components/ProfilePage.tsx
// Mobile full-page profile view

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Bell,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import useProfile from '@/hooks/useProfile';

interface ProfilePageProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ isOpen, onClose }) => {
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
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

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

  // Load profile when opened
  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

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

  const handlePasswordChange = async () => {
    if (!accountSettings.currentPassword || !accountSettings.newPassword) {
      console.error('Missing password fields');
      return;
    }
    
    if (accountSettings.newPassword !== accountSettings.confirmPassword) {
      console.error('Passwords do not match');
      return;
    }
    
    await updateAccountSettings({
      currentPassword: accountSettings.currentPassword,
      newPassword: accountSettings.newPassword,
    });
    
    // Clear password fields
    updateAccountSettings({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
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

  if (!isOpen) return null;

  const currentName = editing ? tempUser.fullName || user?.fullName : user?.fullName;
  const currentPicture = previewUrl || tempUser.profilePicture || user?.profilePicture;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 overflow-y-auto h-full">
        {/* Error Display */}
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Profile Content */}
        {user && !loading && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentPicture} alt={currentName} />
                      <AvatarFallback className="text-xl">
                        {getInitials(currentName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {editing && (
                      <Button
                        size="icon"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {editing ? (
                      <div className="space-y-3">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={tempUser.fullName || ''}
                          onChange={(e) => setTempUser(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Enter your full name"
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold">{currentName}</h2>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Status and Role */}
                <div className="flex items-center gap-3 mt-4">
                  {getStatusBadge(user.accountStatus)}
                  <span className="text-sm text-muted-foreground capitalize">
                    {user.role}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Edit Actions */}
            {editing && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditToggle}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {!editing && (
              <Button
                onClick={handleEditToggle}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'settings')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Member Since</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Account Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(user.accountStatus)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? 'text' : 'password'}
                            value={accountSettings.currentPassword || ''}
                            onChange={(e) => updateAccountSettings({ 
                              currentPassword: e.target.value 
                            })}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setShowPasswords(prev => ({ 
                              ...prev, 
                              current: !prev.current 
                            }))}
                          >
                            {showPasswords.current ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? 'text' : 'password'}
                            value={accountSettings.newPassword || ''}
                            onChange={(e) => updateAccountSettings({ 
                              newPassword: e.target.value 
                            })}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setShowPasswords(prev => ({ 
                              ...prev, 
                              new: !prev.new 
                            }))}
                          >
                            {showPasswords.new ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={accountSettings.confirmPassword || ''}
                            onChange={(e) => updateAccountSettings({ 
                              confirmPassword: e.target.value 
                            })}
                            placeholder="Confirm new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setShowPasswords(prev => ({ 
                              ...prev, 
                              confirm: !prev.confirm 
                            }))}
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handlePasswordChange}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        Update Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          Receive email updates about your account
                        </p>
                      </div>
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
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Push Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
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
                  </CardContent>
                </Card>

                {/* Privacy Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Profile Visibility</p>
                        <p className="text-xs text-muted-foreground">
                          Make your profile visible to other users
                        </p>
                      </div>
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
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Logout Button */}
            <Separator />
            
            <Button
              variant="destructive"
              onClick={logout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Profile picture upload"
        />
      </div>
    </div>
  );
};

export default ProfilePage;
