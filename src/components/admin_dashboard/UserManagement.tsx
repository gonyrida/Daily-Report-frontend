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
  MoreHorizontal,
  Eye,
  EyeOff,
  Trash
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
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/apiFetch';
import { Label } from "@/components/ui/label";
import ConfirmationModal from '../purchase_request/ConfirmationModal';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    department: '',
    password: '',
    orgLevel: undefined,
    role: 'user'
  });

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
    password: '',
    orgLevel: undefined,
    role: 'user'
  });

  // Separate state for password confirmation in edit mode
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      // Validate password match in edit mode
      if (isEditMode && newUser.password && newUser.password !== confirmPassword) {
        toast({ 
          title: "Error", 
          description: "Passwords do not match" 
        });
        setIsCreatingUser(false);
        return;
      }

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
          password: '',
          orgLevel: undefined,
          role: 'user'
        });
        setConfirmPassword('');
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
      password: '',
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
      password: '',
      orgLevel: undefined,
      role: 'user'
    });
    setConfirmPassword('');
    setShowConfirmPassword(false);
    setPasswordConfirmError('');
    setShowPassword(false);
    setPasswordError('');
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

  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true)
    let response;
    let result;
    try {
      response = await apiDelete(`/admin/users/${userId}`);
      result = await response.json();
      
      if (result.success) {
        toast({ title: "Success", description: "User deleted successfully" });
        fetchUsers();
      }
    } catch (error) {
      toast({ title: "Error", description: result.message || "Failed to delete user" });
    } finally {
      setIsDeletingUser(false)
    }
  }

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
                              {user.orgLevel.toString() || 'N/A'}
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
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setShowDeleteConfirm(true);
                                      setCurrentUser({
                                        id: user._id,
                                        firstName: user.firstName,
                                        lastName: user.lastName,
                                        email: user.email,
                                        position: user.position,
                                        department: user.department,
                                        password: '',
                                        orgLevel: user.orgLevel,
                                        role: user.role
                                      });
                                    }}
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
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

            {/* Delete User Confirmation Modal */}
            <ConfirmationModal
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={() => {
                setShowDeleteConfirm(false);
                handleDeleteUser(currentUser.id);
              }}
              title="Confirm Deletion"
              message={`Are you sure you want to delete ${currentUser.firstName} ${currentUser.lastName} ?`}
              confirmText="Delete Request"
              isLoading={isDeletingUser}
            />

            {/* Add User Dialog */}
            <Dialog 
              open={showAddUser}
              onOpenChange={(setShowAddUser) => {
                if (!setShowAddUser) {
                  handleCloseModal();
                }
              }}
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

                  {/* Password Inputs for Edit Mode */}
                  {isEditMode && (
                    <>
                      <div className="space-y-2">
                        <Label>New Password (Optional)</Label>
                        <div className='relative'>
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password" 
                            value={newUser.password}
                            onChange={(e) => {
                              setNewUser({...newUser, password: e.target.value});
                              // Clear error when user types
                              if (e.target.value.length < 8) {
                                setPasswordError('Password must be at least 8 characters');
                                setPasswordConfirmError('');
                              } else if (e.target.value !== confirmPassword ) {
                                setPasswordError('');
                                setPasswordConfirmError('Passwords do not match');
                              } else {
                                setPasswordError('');
                                setPasswordConfirmError('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {passwordError && (
                          <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <div className='relative'>
                          <Input 
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm Password" 
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              // Validate match immediately
                              if (e.target.value !== newUser.password) {
                                setPasswordConfirmError('Passwords do not match');
                              } else {
                                setPasswordConfirmError('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {passwordConfirmError && (
                          <p className="text-sm text-red-500 mt-1">{passwordConfirmError}</p>
                        )}
                      </div>
                    </>
                  )}
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