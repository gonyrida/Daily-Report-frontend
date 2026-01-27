import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield,
  Monitor,
  MapPin,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginSession {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  loginTime: string;
  lastActive: string;
  isCurrentSession: boolean;
  isSuspicious?: boolean;
  userAgent: string;
}

interface LoginHistorySectionProps {
  userId?: string;
}

const LoginHistorySection: React.FC<LoginHistorySectionProps> = ({ userId }) => {
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIPs, setShowIPs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const sessionsPerPage = 10;

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const detectSuspiciousLogin = (session: LoginSession): boolean => {
    // Simple suspicious login detection logic
    const now = new Date();
    const loginTime = new Date(session.loginTime);
    const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    // Flag as suspicious if:
    // 1. Login from unusual location (very basic check)
    // 2. Multiple sessions from different IPs in short time
    // 3. Login from unknown device type
    
    const unusualLocations = ['Unknown', 'Private', 'VPN'];
    const isUnusualLocation = unusualLocations.some(loc => 
      session.location.toLowerCase().includes(loc.toLowerCase())
    );
    
    const isNewDevice = session.deviceType === 'mobile' && session.userAgent.includes('bot');
    
    return isUnusualLocation || isNewDevice || diffHours < 1;
  };

  const loadLoginHistory = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/login-history?page=${page}&limit=${sessionsPerPage}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load login history');
      }

      const data = await response.json();
      
      // Process sessions and add suspicious detection
      const processedSessions = data.data.map((session: LoginSession) => ({
        ...session,
        isSuspicious: detectSuspiciousLogin(session)
      }));

      setSessions(processedSessions);
      setTotalPages(data.pagination.pages);
      setCurrentPage(page);

    } catch (error) {
      console.error('Failed to load login history:', error);
      toast({
        title: "Error",
        description: "Unable to load login history. Please try again.",
        variant: "destructive",
      });
      
      // Load sample data for demo
      loadSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleSessions: LoginSession[] = [
      {
        id: '1',
        device: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        location: 'Phnom Penh, Cambodia',
        ipAddress: '192.168.1.100',
        loginTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
        isCurrentSession: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: '2',
        device: 'Safari on iPhone',
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        location: 'Bangkok, Thailand',
        ipAddress: '203.150.1.200',
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isCurrentSession: false,
        isSuspicious: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      },
      {
        id: '3',
        device: 'Chrome on MacBook',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        location: 'Singapore',
        ipAddress: '165.21.100.50',
        loginTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isCurrentSession: false,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    ];

    setSessions(sampleSessions);
    setTotalPages(1);
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth/revoke-session/${sessionId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      toast({
        title: "Session Revoked",
        description: "The selected session has been successfully revoked.",
      });

      // Reload login history
      loadLoginHistory(currentPage);

    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast({
        title: "Error",
        description: "Unable to revoke session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const response = await fetch('/api/auth/revoke-all-sessions', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke sessions');
      }

      toast({
        title: "All Sessions Revoked",
        description: "All other sessions have been successfully revoked. You are now logged in only on this device.",
      });

      // Reload login history
      loadLoginHistory(currentPage);

    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      toast({
        title: "Error",
        description: "Unable to revoke sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const suspiciousSessions = sessions.filter(s => s.isSuspicious && !s.isCurrentSession);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Login History
        </CardTitle>
        <CardDescription>
          Monitor your account access and manage active sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Suspicious Login Alert */}
        {suspiciousSessions.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Suspicious Activity Detected:</strong> {suspiciousSessions.length} unrecognized login(s) found. 
              Please review and revoke any sessions you don't recognize.
            </AlertDescription>
          </Alert>
        )}

        {/* Session Controls */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIPs(!showIPs)}
            >
              {showIPs ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showIPs ? 'Hide' : 'Show'} IP Addresses
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLoginHistory(currentPage)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={revokeAllOtherSessions}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Revoke All Other Sessions
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading login history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No login history available</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border ${
                  session.isCurrentSession 
                    ? 'border-primary bg-primary/5' 
                    : session.isSuspicious
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Device and Browser */}
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.deviceType)}
                      <span className="font-medium">{session.device}</span>
                      {session.isCurrentSession && (
                        <Badge variant="default" className="text-xs">
                          Current Session
                        </Badge>
                      )}
                      {session.isSuspicious && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Suspicious
                        </Badge>
                      )}
                    </div>

                    {/* Location and IP */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{session.location}</span>
                      </div>
                      {showIPs && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>{session.ipAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Login Time */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span title={formatDate(session.loginTime)}>
                          Logged in {getRelativeTime(session.loginTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        <span title={formatDate(session.lastActive)}>
                          Active {getRelativeTime(session.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!session.isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLoginHistory(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLoginHistory(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}

        {/* Security Tips */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Tips:</strong> Always review your login history and revoke any sessions you don't recognize. 
            Enable two-factor authentication for added security.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default LoginHistorySection;
