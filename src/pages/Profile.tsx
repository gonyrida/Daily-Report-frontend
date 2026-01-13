// src/pages/Profile.tsx
// Complete profile page with view and edit functionality

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  User,
  Shield,
  Key,
  LogOut,
  Camera,
  Save,
  X,
  Mail,
  Calendar,
  Settings,
  Bell,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: boolean;
  twoFactorAuth: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const Profile = () => {
  // State Management
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: true,
    twoFactorAuth: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Temporary edit state
  const [tempUser, setTempUser] = useState<Partial<UserProfile>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Integration Functions
  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setUser(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      setUser(data.data);
      setIsEditing(false);
      setTempUser({});
      setSelectedFile(null);
      setPreviewUrl(null);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload picture');
      }
      
      const data = await response.json();
      await updateProfile({ profilePicture: data.imageUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload picture');
    } finally {
      setIsUploading(false);
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      setAccountSettings(prev => ({ ...prev, ...settings }));
      
      toast({
        title: "Settings Updated",
        description: "Your account settings have been successfully updated.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout even on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  // Event Handlers
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setTempUser({});
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      // Start editing
      setIsEditing(true);
      setTempUser({
        fullName: user?.fullName,
        profilePicture: user?.profilePicture,
      });
    }
  };

  const handleSaveChanges = async () => {
    const updates: Partial<UserProfile> = {};
    
    if (tempUser.fullName !== user?.fullName) {
      updates.fullName = tempUser.fullName;
    }
    
    if (selectedFile) {
      await uploadProfilePicture(selectedFile);
      return;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    } else {
      setIsEditing(false);
      setTempUser({});
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Profile picture must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePasswordChange = async () => {
    if (!accountSettings.currentPassword || !accountSettings.newPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter current and new passwords.",
        variant: "destructive",
      });
      return;
    }
    
    if (accountSettings.newPassword !== accountSettings.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    await updateAccountSettings({
      currentPassword: accountSettings.currentPassword,
      newPassword: accountSettings.newPassword,
    });
    
    // Clear password fields
    setAccountSettings(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
  };

  // Utility Functions
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

  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const currentName = isEditing ? tempUser.fullName || user?.fullName : user?.fullName;
  const currentPicture = previewUrl || tempUser.profilePicture || user?.profilePicture;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Content */}
        {user && !isLoading && (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={currentPicture} alt={currentName} />
                      <AvatarFallback className="text-xl">
                        {getInitials(currentName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isEditing && (
                      <Button
                        size="icon"
                        className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            value={tempUser.fullName || ''}
                            onChange={(e) => setTempUser(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="Enter your full name"
                            className="max-w-md"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold">{currentName}</h2>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(user.accountStatus)}
                    <p className="text-sm text-muted-foreground capitalize mt-2">
                      {user.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditToggle}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {!isEditing && (
              <Button
                onClick={handleEditToggle}
                variant="outline"
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

              <TabsContent value="profile" className="space-y-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
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

              <TabsContent value="settings" className="space-y-6">
                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Security</CardTitle>
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
                            onChange={(e) => setAccountSettings(prev => ({ 
                              ...prev, 
                              currentPassword: e.target.value 
                            }))}
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
                            onChange={(e) => setAccountSettings(prev => ({ 
                              ...prev, 
                              newPassword: e.target.value 
                            }))}
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
                            onChange={(e) => setAccountSettings(prev => ({ 
                              ...prev, 
                              confirmPassword: e.target.value 
                            }))}
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
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
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
                    <CardTitle>Notifications</CardTitle>
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
                    <CardTitle>Privacy</CardTitle>
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
              onClick={handleLogout}
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

export default Profile;
