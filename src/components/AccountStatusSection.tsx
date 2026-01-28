import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  AlertTriangle,
  UserX,
  Trash2,
  Shield,
  Clock,
  Key,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AccountStatusSectionProps {
  userId?: string;
  userEmail?: string;
}

const AccountStatusSection: React.FC<AccountStatusSectionProps> = ({ userId, userEmail }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDeactivateAccount = async () => {
    if (!password.trim()) {
      setErrors({ password: "Password is required for account deactivation" });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/deactivate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to deactivate account');
      }

      toast({
        title: "Account Deactivated",
        description: "Your account has been temporarily deactivated. You can reactivate it by logging back in.",
      });

      // Clear local data and redirect to login
      localStorage.clear();
      navigate('/login');

    } catch (error: any) {
      console.error('Account deactivation error:', error);
      
      let errorMessage = "Failed to deactivate account. Please try again.";
      if (error.message.includes('password')) {
        errorMessage = "Incorrect password. Please check and try again.";
        setErrors({ password: "Incorrect password" });
      }

      toast({
        title: "Deactivation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setErrors({ password: "Password is required for account deletion" });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          password,
          confirmation: `DELETE ${userEmail}` // Additional security measure
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. We're sorry to see you go.",
      });

      // Clear all data and redirect
      localStorage.clear();
      navigate('/login');

    } catch (error: any) {
      console.error('Account deletion error:', error);
      
      let errorMessage = "Failed to delete account. Please try again.";
      if (error.message.includes('password')) {
        errorMessage = "Incorrect password. Please check and try again.";
        setErrors({ password: "Incorrect password" });
      }

      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModalState = () => {
    setPassword("");
    setShowPassword(false);
    setErrors({});
    setIsProcessing(false);
  };

  const closeDeactivateModal = () => {
    resetModalState();
    setShowDeactivateModal(false);
  };

  const closeDeleteModal = () => {
    resetModalState();
    setShowDeleteModal(false);
  };

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible account actions. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Warning:</strong> Actions in this section cannot be undone. Please read all information carefully before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {/* Deactivate Account */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-orange-600 flex items-center gap-2 mb-2">
                    <UserX className="h-4 w-4" />
                    Deactivate Account
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Temporarily disable your account. You can reactivate it later by logging back in.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Reversible • Data preserved • Can be restored</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => setShowDeactivateModal(true)}
                >
                  Deactivate
                </Button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-red-600 flex items-center gap-2 mb-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Irreversible • Data deleted • Cannot be restored</span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> All account actions are logged for audit purposes. You will receive email confirmation for any account changes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Deactivate Account Modal */}
      <Dialog open={showDeactivateModal} onOpenChange={closeDeactivateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="h-5 w-5" />
              Deactivate Account
            </DialogTitle>
            <DialogDescription>
              This will temporarily disable your account. You can reactivate it by logging back in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>What happens when you deactivate:</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>Your account will be temporarily disabled</li>
                  <li>Your data will be preserved</li>
                  <li>You can reactivate by logging back in</li>
                  <li>Others won't be able to find your profile</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="deactivate-password">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="deactivate-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({});
                    }
                  }}
                  placeholder="Enter your password to confirm"
                  className={errors.password ? "border-red-500" : ""}
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isProcessing}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeDeactivateModal}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                onClick={handleDeactivateAccount}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={showDeleteModal} onOpenChange={closeDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>⚠️ WARNING: This action is irreversible!</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>All your data will be permanently deleted</li>
                  <li>Your profile, reports, and settings will be removed</li>
                  <li>You cannot recover your account or data</li>
                  <li>You'll need to create a new account to use our services again</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Account to be deleted:</strong><br />
                <span className="font-mono">{userEmail || 'your-account@example.com'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-password">Password *</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({});
                    }
                  }}
                  placeholder="Enter your password to confirm deletion"
                  className={errors.password ? "border-red-500" : ""}
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isProcessing}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountStatusSection;
