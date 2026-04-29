import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Mail,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { 
  SidebarTrigger, 
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { apiGet, apiPost, apiPut } from '@/lib/apiFetch';
import { Label } from "@/components/ui/label";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false); // Status for loading state
  const [editingUser, setEditingUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  //New user state
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    department: '',
    orgLevel: undefined,
    role: 'user'
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiGet(`/admin/all-users?page=${page}&limit=10`);
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
        setFilteredUsers(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users
  useEffect(() => {
    // Set a timer to run after 500ms
    const delayDebounceFn = setTimeout(() => {
      // Call the unified fetcher
      handleFilter(roleFilter);
    }, 500);

    // this clears the previous timer and starts a new one if the user types again.
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Add before return statement
  const handleCreateUser = async () => {
    try {
      setIsCreatingUser(true); // Start loading      

      let response;
      if (isEditMode && editingUser) {
        response = await apiPut(`/admin/users/${editingUser._id}`, newUser);
      } else {
        response = await apiPost('/admin/users', newUser);
      }

      const result = await response.json();
      
      if (result.success) {
        toast({ 
          title: "Success", 
          description: isEditMode ? "User updated successfully" : `User created successfully, Please notify user to verify their email at ${newUser.email}`
        });
        setShowAddUser(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          position: '',
          department: '',
          orgLevel: undefined,
          role: 'user'
        });
        fetchUsers(); // Refresh user list
      } else {
        toast({ 
          title: "Error", 
          description: result.message || "Failed to create user" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create user" 
      });
    } finally {
      setIsCreatingUser(false); // Stop loading
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setNewUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      position: user.position || '',
      department: user.department || '',
      orgLevel: user.orgLevel,
      role: user.role
    });
    setIsEditMode(true);
    setShowAddUser(true);
  };

  const handleCloseModal = () => {
    setShowAddUser(false);
    setIsEditMode(false);
    setEditingUser(null);
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      position: '',
      department: '',
      orgLevel: undefined,
      role: 'user'
    });
  };

  const handleFilter = async (value) => {
    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('page', "1");
      params.set('limit', pagination.limit.toString());
      if (searchTerm) params.set('search', searchTerm);
      if (value) params.set('role', value);

      const response = await apiGet(`/admin/all-users${params.toString() ? `?${params.toString()}` : ''}`);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        setFilteredUsers(result.data);
        setPagination(result.pagination);
      } else {
        toast({ title: "Error", description: result.message || "Failed to filter users by role" });
      }
    } catch (error) {
      console.error('Failed to fetch users by role:', error);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />
        <SidebarInset>
          <div className="space-y-6">
            {/* Header with breadcrumb and buttons */}
            <div className="flex items-center gap-4 ml-6 mt-6">
              <SidebarTrigger />
              <div className="flex flex-col space-y-1">
                <h1 className="text-lg font-semibold">User Management</h1>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <button 
                    onClick={() => navigate('/admin')}
                    className="hover:text-foreground transition-colors"
                  >
                    Admin Dashboard
                  </button>
                  <span>/</span>
                  <span className="text-foreground">User Management</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select 
                    value={roleFilter}
                    onValueChange={(value) => {
                      setRoleFilter(value);
                      handleFilter(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {filteredUsers.length} users found
                  </div>

                  <Button
                    onClick={() => setShowAddUser(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User List - Table Design */}
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Position
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Department
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Org Level
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Role
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm">{user.position || 'Not assigned'}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm">{user.department || 'Not assigned'}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline" className="text-xs">
                              {user.orgLevel || 'N/A'}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Resend Verification
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add this after the table, before the closing CardContent */}
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    {pagination.total} users total
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(pagination.page - 1)}
                      disabled={!pagination.hasPrev || loading}
                    >
                      Previous
                    </Button>
                    
                    <Select
                      value={pagination.page.toString()}
                      onValueChange={(value) => fetchUsers(parseInt(value))}
                    >
                      <SelectTrigger className="w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: pagination.pages }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-sm text-muted-foreground">
                      of {pagination.pages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(pagination.page + 1)}
                      disabled={!pagination.hasNext || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add User Dialog */}
            <Dialog 
              open={showAddUser}
              onOpenChange={setShowAddUser}
            >
              <DialogContent className="max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit User" : "Add New User"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input 
                      placeholder="First Name" 
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input 
                      placeholder="Last Name" 
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Position *</Label>
                    <Input 
                      placeholder="Position" 
                      value={newUser.position}
                      onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Department *</Label>
                    <Input 
                      type="department" 
                      placeholder="Department" 
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    />
                  </div>
                  <Select 
                    value={newUser.orgLevel?.toString()}
                    onValueChange={(value) => setNewUser({...newUser, orgLevel: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Organization Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Team member</SelectItem>
                      <SelectItem value="1">1 - Team Leader</SelectItem>
                      <SelectItem value="2">2 - Department Head</SelectItem>
                      <SelectItem value="3">3 - CEO</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({...newUser, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCloseModal}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={isCreatingUser} // ✅ Disable during loading
                    >
                      {isCreatingUser 
                        ? (isEditMode ? "Updating User..." : "Adding User...") 
                        : (isEditMode ? "Update User" : "Add User")
                      }
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserManagement;