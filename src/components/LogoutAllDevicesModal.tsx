import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LogOut,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface LogoutAllDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeCurrent?: boolean;
}

const LogoutAllDevicesModal: React.FC<LogoutAllDevicesModalProps> = ({ 
  isOpen, 
  onClose, 
  includeCurrent = false 
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutAllDevices = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/auth/revoke-all-sessions', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to logout from all devices');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: includeCurrent 
          ? "You have been logged out from all devices. Please log in again."
          : "All other devices have been logged out successfully.",
      });

      // If including current session, redirect to login
      if (includeCurrent) {
        // Clear local storage and cookies
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        // Just close modal and refresh login history
        onClose();
        // Trigger a refresh of login history by emitting a custom event
        window.dispatchEvent(new CustomEvent('refreshLoginHistory'));
      }

    } catch (error) {
      console.error('Logout all devices error:', error);
      toast({
        title: "Error",
        description: "Failed to logout from all devices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {includeCurrent ? 'Logout from All Devices' : 'Logout Other Devices'}
          </DialogTitle>
          <DialogDescription>
            {includeCurrent 
              ? 'This will log you out from all devices including your current session.'
              : 'This will log you out from all other devices except your current session.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {includeCurrent ? (
                <div>
                  <strong>Warning:</strong> You will need to log in again on all devices after this action.
                  Any unsaved work will be lost.
                </div>
              ) : (
                <div>
                  <strong>Note:</strong> Other devices will need to log in again. Your current session will remain active.
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Security Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Security Action</p>
                <p>
                  {includeCurrent 
                    ? 'All active sessions will be immediately invalidated for your security.'
                    : 'All other active sessions will be invalidated to protect your account.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoggingOut}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant={includeCurrent ? "destructive" : "default"}
              onClick={handleLogoutAllDevices}
              disabled={isLoggingOut}
              className="flex-1"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  {includeCurrent ? 'Logout All Devices' : 'Logout Others'}
                </>
              )}
            </Button>
          </div>

          {/* Success Message (shown after completion) */}
          {isLoggingOut && (
            <div className="text-center text-sm text-muted-foreground">
              {includeCurrent 
                ? 'Redirecting to login page...'
                : 'Revoking sessions from other devices...'
              }
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutAllDevicesModal;
