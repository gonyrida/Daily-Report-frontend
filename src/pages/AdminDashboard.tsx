import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  Activity,
  TrendingUp 
} from 'lucide-react';
import { 
    SidebarProvider, 
    SidebarInset,
    SidebarTrigger 
} from '@/components/ui/sidebar';
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/apiFetch';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiGet('/admin/recent-users');
        const result = await response.json(); // Parse the JSON response
        
        if (result.success) {
          setUsers(result.data.map(user => ({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.isActive ? 'active' : 'inactive',
            position: user.role === 'admin' ? 'Administrator' : 'User',
            lastLogin: user.lastLogin || 'Never'
          })));
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />
        <SidebarInset>
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col space-y-2"
                    onClick={() => navigate('/admin/user-management')}
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-xs">Manage Users</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <FileText className="h-6 w-6" />
                    <span className="text-xs">View Projects</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-xs">Analytics</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Settings className="h-6 w-6" />
                    <span className="text-xs">Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Position - Center */}
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{user.position}</span>
                        </div>
                        
                        {/* Status - Center */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status || 'Active'}
                          </Badge>
                        </div>
                        
                        {/* Role & Last Login - Right */}
                        <div className="text-right">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;