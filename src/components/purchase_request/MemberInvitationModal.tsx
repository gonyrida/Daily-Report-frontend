import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiFetch';

interface MemberInvitationModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onMembersAdded: (members: any[]) => void;
  currentMembers: any[]; // Members already in the project
}

const MemberInvitationModal: React.FC<MemberInvitationModalProps> = ({
  isOpen,
  setIsOpen,
  onMembersAdded,
  currentMembers
}) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Add this mock data after the imports in MemberInvitationModal.tsx
  const mockUsers = [
    {
      _id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@company.com',
      department: 'IT',
      role: 'Developer',
      position: 'Senior Developer'
    },
    {
      _id: '2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@company.com',
      department: 'Design',
      role: 'Designer',
      position: 'Lead Designer'
    },
    {
      _id: '3',
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@company.com',
      department: 'Development',
      role: 'Frontend Developer',
      position: 'Mid-Level'
    },
    {
      _id: '4',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.d@company.com',
      department: 'QA',
      role: 'QA Engineer',
      position: 'Junior'
    },
    {
      _id: '5',
      firstName: 'Robert',
      lastName: 'Williams',
      email: 'r.williams@company.com',
      department: 'IT',
      role: 'Manager',
      position: 'Project Manager'
    },
    {
      _id: '6',
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'lisa.a@company.com',
      department: 'Finance',
      role: 'Analyst',
      position: 'Senior Analyst'
    },
    {
      _id: '7',
      firstName: 'Tom',
      lastName: 'Wilson',
      email: 'tom.w@company.com',
      department: 'IT',
      role: 'Developer',
      position: 'Junior Developer'
    },
    {
      _id: '8',
      firstName: 'Jessica',
      lastName: 'Brown',
      email: 'jessica.b@company.com',
      department: 'HR',
      role: 'HR Specialist',
      position: 'HR Manager'
    },
    {
      _id: '9',
      firstName: 'David',
      lastName: 'Martinez',
      email: 'david.m@company.com',
      department: 'Operations',
      role: 'Operations Manager',
      position: 'Senior Manager'
    },
    {
      _id: '10',
      firstName: 'Amanda',
      lastName: 'Taylor',
      email: 'amanda.t@company.com',
      department: 'Marketing',
      role: 'Marketing Specialist',
      position: 'Marketing Lead'
    }
  ];

  // Fetch available users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    setLoading(true);
    try {
      const response = await apiGet('/purchase-requests/users'); // Adjust endpoint as needed
      const result = await response.json();
      
      if (result.success) {
        // Filter out users already in the project
        const currentMemberIds = currentMembers.map(m => m._id);
        const available = result.data.filter(user => !currentMemberIds.includes(user._id));
        setAvailableUsers(available);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch available users"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = () => {
    const selectedMemberData = availableUsers.filter(user => selectedUsers.includes(user._id));
    
    const formattedMembers = selectedMemberData.map(user => ({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      department: user.department || 'Not specified',
      role: user.role || 'Member',
      position: user.position || 'Team Member',
      selected: false
    }));

    onMembersAdded(formattedMembers);
    setSelectedUsers([]);
    setIsOpen(false);
    
    toast({
      title: "Success",
      description: `${formattedMembers.length} member(s) added to project`
    });
  };

  const filteredUsers = availableUsers.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Project Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Summary */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedUsers.length} user(s) selected
              </span>
              <Badge variant="secondary">
                {selectedUsers.length}
              </Badge>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">Loading users...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">
                  {searchTerm ? 'No users found matching your search' : 'No available users'}
                </div>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.includes(user._id)
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleUserSelection(user._id)}
                >
                  <Checkbox
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleUserSelection(user._id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.department && (
                      <div className="text-xs text-gray-400">{user.department}</div>
                    )}
                  </div>
                  {user.role && (
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0}
            >
              Add {selectedUsers.length} Member(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberInvitationModal;